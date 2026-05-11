import { z } from "zod";

export const ValidatePlotInputSchema = z.object({
  plot: z.string().min(10, "Plot description must be at least 10 characters").max(5000),
  genre: z.string().optional(),
});
export type ValidatePlotInput = z.infer<typeof ValidatePlotInputSchema>;

export const MovieMatchSchema = z.object({
  title: z.string(),
  description: z.string(),
  cast: z.array(z.string()),
  director: z.string(),
  producer: z.string(),
  rating: z.number().min(0).max(10), // e.g. IMDB out of 10
  rank: z.number(), // 1 being highest rated match
  matchReasoning: z.string(),
  posterSearchQuery: z.string(),
  posterUrl: z.string().optional(),
});

export const ValidationResultSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  originalQuery: z.string(),
  movies: z.array(MovieMatchSchema),
});

export type MovieMatchResult = z.infer<typeof ValidationResultSchema>;
export type MovieMatch = z.infer<typeof MovieMatchSchema>;
