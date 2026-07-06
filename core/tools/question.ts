import OpenAI from "openai";
import z from "zod";
import { pipe, type QuestionPayload } from "../agent/index.js";

const QuestionArgs = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      header: z.string(),
      options: z.array(
        z.object({
          label: z.string(),
          description: z.string(),
        }),
      ),
      multiple: z.boolean().optional(),
      allowCustom: z.boolean().optional().default(true),
    }),
  ),
});

export const questionDefinition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "question",
    description:
      "Ask the user questions during execution. Use this tool to: " +
      "1. Gather user preferences or requirements. " +
      "2. Clarify ambiguous instructions. " +
      "3. Get decisions on implementation choices. " +
      "4. Offer choices to the user about what direction to take. " +
      "If you recommend a specific option, make it the first option and add '(Recommended)' at the end. " +
      "Set allowCustom to true if the user might want to type their own answer instead of choosing from options.",
    parameters: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: {
                type: "string",
                description: "Complete question text",
              },
              header: {
                type: "string",
                description: "Very short label (max 30 chars)",
              },
              options: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: {
                      type: "string",
                      description: "Display text (1-5 words, concise)",
                    },
                    description: {
                      type: "string",
                      description: "Explanation of the choice",
                    },
                  },
                  required: ["label", "description"],
                },
              },
              multiple: {
                type: "boolean",
                description: "Allow selecting multiple choices",
              },
              allowCustom: {
                type: "boolean",
                description: "Allow user to type their own custom answer instead of selecting from options",
              },
            },
            required: ["question", "header", "options"],
          },
        },
      },
      required: ["questions"],
    },
  },
};

function askViaPicker(q: Omit<QuestionPayload, "resolve">): Promise<string> {
  return new Promise((resolve) => {
    pipe.run({ type: "question", payload: { ...q, resolve } });
  });
}

export async function runQuestion(args: unknown): Promise<string> {
  const parsed = QuestionArgs.safeParse(args);
  if (!parsed.success) return `Error: ${parsed.error.message}`;
  const { questions } = parsed.data;

  const answers: string[] = [];

  for (const q of questions) {
    if (q.options.length === 0) {
      answers.push("(no options)");
      continue;
    }

    const answer = await askViaPicker({
      question: q.question,
      header: q.header,
      options: q.options,
      multiple: q.multiple ?? false,
      allowCustom: q.allowCustom ?? false,
    });
    answers.push(answer);
  }

  const pairs = questions
    .map((q, i) => `"${q.question}" → "${answers[i]}"`)
    .join(", ");

  return `User has answered your questions: ${pairs}. Continue with the user's choices in mind.`;
}
