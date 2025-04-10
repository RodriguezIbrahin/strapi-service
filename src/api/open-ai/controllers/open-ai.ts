/**
 * open-ai controller
 */

import { factories } from "@strapi/strapi";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default factories.createCoreController(
  "api::open-ai.open-ai",
  ({ strapi }) => ({
    async generateData(ctx) {
      try {
        const { projectId } = ctx.params;
        const entity = await strapi.entityService.findMany(
          "api::open-ai.open-ai",
          {
            filters: {
              proyecto: projectId,
            },
          }
        );

        if (!entity?.[0]) {
          ctx.send({ error: "Failed to contact OpenAI" }, 500);
        }
        const rawSchema: any = entity?.[0]?.schema;
        const properties = {};
        const required = [];

        for (const key in rawSchema) {
          const type = rawSchema[key];
          properties[key] = { type };
          required.push(key);
        }

        const schema = {
          type: "object",
          properties: {
            autos: {
              type: "array",
              items: {
                type: "object",
                properties,
                required,
                additionalProperties: false,
              },
            },
          },
          required: ["autos"],
          additionalProperties: false,
        };

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "Eres un asistente virtual, que se limita a responder con las estructura definida",
            },
            { role: "user", content: entity?.[0]?.prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: `schema_${projectId}`,
              description: `A structured object with company data ${projectId}`,
              schema: schema,
              strict: true,
            },
          },
        });

        const parsed = JSON.parse(response.choices[0].message.content.trim());
        ctx.send(parsed);
      } catch (err) {
        strapi.log.error("OpenAI error:", err);
        ctx.send({ error: "Failed to contact OpenAI" }, 500);
      }
    },
  })
);
