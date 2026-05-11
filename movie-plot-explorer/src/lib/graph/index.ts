import { StateGraph } from "@langchain/langgraph";
import { v4 as uuidv4 } from "uuid";
import { callOpenRouter } from "../openrouter/client";
import { VALIDATION_PROMPTS } from "../prompts/validation";
import { MovieMatchResult } from "../schemas/validation";

// The state schema for our LangGraph
export interface GraphState {
  plot: string;
  movieResult: any;
  finalResult: MovieMatchResult | null;
}

const graphStateChannels = {
  plot: { value: (x: string, y: string) => y ?? x, default: () => "" },
  movieResult: { value: (x: any, y: any) => y ?? x, default: () => null },
  finalResult: { value: (x: MovieMatchResult | null, y: MovieMatchResult | null) => y ?? x, default: () => null },
};

const matcherNode = async (state: GraphState) => {
  try {
    const prompt = VALIDATION_PROMPTS.matcher(state.plot);
    const responseText = await callOpenRouter([
      { role: 'system', content: prompt }
    ], { temperature: 0.3 });

    console.log("RAW LLM OUTPUT:", responseText);

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const resultString = jsonMatch ? jsonMatch[0] : responseText;
    
    let parsed: any;
    try {
      parsed = JSON.parse(resultString);
    } catch {
      parsed = { movies: [] };
    }

    return { movieResult: parsed };
  } catch (error) {
    console.error("Matcher Node Error:", error);
    return { movieResult: { movies: [] } };
  }
};

async function getWikipediaPoster(title: string): Promise<string | null> {
  try {
    // We use Wikipedia's robust search generator to find the closest matching film article
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(title + " film")}&gsrlimit=1&prop=pageimages&format=json&pithumbsize=500&origin=*`
    );
    const data = await res.json();
    const pages = data?.query?.pages;
    if (pages) {
      const pageId = Object.keys(pages)[0];
      if (pageId !== '-1' && pages[pageId].thumbnail?.source) {
        return pages[pageId].thumbnail.source;
      }
    }
    return null;
  } catch {
    return null;
  }
}

const aggregatorNode = async (state: GraphState) => {
  const rawMovies = state.movieResult?.movies || [];
  
  // Fetch Wikipedia posters in parallel for all movies
  const moviesWithPosters = await Promise.all(rawMovies.map(async (m: any) => {
    const posterUrl = await getWikipediaPoster(m.title || "");
    return {
      title: m.title || "Unknown",
      description: m.description || "",
      cast: Array.isArray(m.cast) ? m.cast : [],
      director: m.director || "Unknown",
      producer: m.producer || "Unknown",
      rating: m.rating || 0,
      rank: m.rank || 99,
      matchReasoning: m.matchReasoning || "",
      posterSearchQuery: m.posterSearchQuery || m.title,
      posterUrl: posterUrl || undefined
    };
  }));

  const finalResult: MovieMatchResult = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    originalQuery: state.plot,
    movies: moviesWithPosters
  };

  // Sort strictly by rank
  finalResult.movies.sort((a, b) => a.rank - b.rank);

  return { finalResult };
};

export function buildValidationGraph() {
  const workflow = new StateGraph<GraphState>({
    channels: graphStateChannels as any,
  })
    .addNode("matcher", matcherNode)
    .addNode("aggregator", aggregatorNode)
    .addEdge("__start__", "matcher")
    .addEdge("matcher", "aggregator")
    .addEdge("aggregator", "__end__");

  return workflow.compile();
}

export const validationGraph = buildValidationGraph();
