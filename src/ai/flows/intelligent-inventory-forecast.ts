'use server';
/**
 * @fileOverview This file defines a Genkit flow for intelligent inventory forecasting.
 *
 * - intelligentInventoryForecast - A function that provides an AI-generated stock replenishment schedule.
 * - IntelligentInventoryForecastInput - The input type for the intelligentInventoryForecast function.
 * - IntelligentInventoryForecastOutput - The return type for the intelligentInventoryForecast function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const IntelligentInventoryForecastInputSchema = z.object({
  ingredients: z.array(z.object({
    name: z.string().describe('The name of the ingredient (e.g., "Tea Powder", "Milk", "Sugar").'),
    currentStock: z.number().describe('The current quantity of the ingredient in stock.'),
    unit: z.string().describe('The unit of measurement for the ingredient (e.g., "grams", "liters", "kg").'),
    averageDailySales: z.number().describe('The average quantity of this ingredient sold per day based on recent historical data.'),
    leadTimeDays: z.number().describe('The number of days it typically takes to receive an order for this ingredient from the supplier.'),
    safetyStockDays: z.number().describe('The number of days of supply to keep as a safety buffer to prevent stockouts.'),
    lastOrderDate: z.string().describe('The ISO date string (YYYY-MM-DD) of the last order placed for this ingredient.'),
    lastOrderQuantity: z.number().describe('The quantity of the last order placed for this ingredient.'),
  })).describe('A list of key ingredients with their relevant inventory and sales data.'),
});
export type IntelligentInventoryForecastInput = z.infer<typeof IntelligentInventoryForecastInputSchema>;

const IntelligentInventoryForecastOutputSchema = z.object({
  replenishmentSchedule: z.array(z.object({
    ingredientName: z.string().describe('The name of the ingredient requiring replenishment.'),
    recommendedOrderQuantity: z.number().describe('The recommended quantity to order for this ingredient.'),
    unit: z.string().describe('The unit of measurement for the recommended order quantity.'),
    orderBeforeDate: z.string().describe('The ISO date string (YYYY-MM-DD) by which the order should be placed to prevent stockouts, considering lead time and safety stock.'),
    reasoning: z.string().describe('A clear and concise explanation for the recommended order quantity and date, based on sales velocity, current stock, lead time, and safety stock.'),
  })).describe('A list of replenishment recommendations for specific ingredients.'),
  overallSummary: z.string().describe('An overall summary of the inventory status, highlighting critical items and general recommendations for ordering strategy.'),
});
export type IntelligentInventoryForecastOutput = z.infer<typeof IntelligentInventoryForecastOutputSchema>;

export async function intelligentInventoryForecast(input: IntelligentInventoryForecastInput): Promise<IntelligentInventoryForecastOutput> {
  return intelligentInventoryForecastFlow(input);
}

const intelligentInventoryForecastPrompt = ai.definePrompt({
  name: 'intelligentInventoryForecastPrompt',
  input: { schema: IntelligentInventoryForecastInputSchema },
  output: { schema: IntelligentInventoryForecastOutputSchema },
  prompt: `You are an expert inventory manager for "The Magic Tea" shop, specializing in preventing stockouts and optimizing ordering efficiency. Your task is to analyze the provided ingredient data and generate a stock replenishment schedule with clear, concise reasoning.\n\nFor each ingredient, you need to determine:\n1.  **When to order (orderBeforeDate)**: Calculate the date by which an order must be placed to ensure continuous supply. This should consider the current stock, average daily sales, lead time, and safety stock. The order should be placed before the stock level drops below safety stock, accounting for the lead time.\n2.  **How much to order (recommendedOrderQuantity)**: Calculate the optimal quantity to order. The goal is to bring the stock level to cover at least 7-14 days of future sales after the new stock arrives, plus the safety stock. This quantity should also consider avoiding excessive inventory.\n\nHere is the ingredient data:\n{{#each ingredients}}\nIngredient Name: {{{name}}}\nCurrent Stock: {{{currentStock}}} {{{unit}}}\nAverage Daily Sales: {{{averageDailySales}}} {{{unit}}} per day\nLead Time: {{{leadTimeDays}}} days\nSafety Stock: {{{safetyStockDays}}} days of supply\nLast Order Date: {{{lastOrderDate}}}\nLast Order Quantity: {{{lastOrderQuantity}}} {{{unit}}}\n\n---\n{{/each}}\n\nPlease generate the replenishment schedule in JSON format as described by the output schema.\nProvide an 'overallSummary' at the end that briefly outlines the key takeaways from the forecast and any general advice.\nEnsure all dates are in ISO date string format (YYYY-MM-DD).\n`,
});

const intelligentInventoryForecastFlow = ai.defineFlow(
  {
    name: 'intelligentInventoryForecastFlow',
    inputSchema: IntelligentInventoryForecastInputSchema,
    outputSchema: IntelligentInventoryForecastOutputSchema,
  },
  async (input) => {
    const { output } = await intelligentInventoryForecastPrompt(input);
    return output!;
  }
);
