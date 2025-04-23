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
        const { data } = ctx.request.body || {}; // 👈 extra desde body

        const entity = await strapi.entityService.findMany(
          "api::open-ai.open-ai",
          {
            filters: {
              proyecto: projectId,
            },
          }
        );

        if (!entity?.[0]) {
          ctx.send({ error: "No existe el proyecto" }, 500);
          return;
        }

        const rawSchema: any = entity?.[0]?.schema;

        // 🔧 Función recursiva para generar JSON Schema desde rawSchema anidado
        function buildJsonSchemaFromRaw(raw: any): any {
          const build = (node: any): any => {
            if (typeof node === "string") {
              return { type: node.toLowerCase() };
            }

            if (Array.isArray(node)) {
              return {
                type: "array",
                items: build(node[0]),
              };
            }

            if (typeof node === "object") {
              const props: Record<string, any> = {};
              const req: string[] = [];

              for (const key in node) {
                props[key] = build(node[key]);
                req.push(key);
              }

              return {
                type: "object",
                properties: props,
                required: req,
                additionalProperties: false,
              };
            }

            throw new Error("Unsupported schema type");
          };

          return build(raw);
        }

        // 🧱 Construir el schema final con propiedad raíz 'autos'
        const schema = {
          type: "object",
          properties: {
            autos: {
              type: "array",
              items: buildJsonSchemaFromRaw(rawSchema),
            },
          },
          required: ["autos"],
          additionalProperties: false,
        };

        const fullPrompt = data
          ? `${entity?.[0]?.prompt}\n\n Datos extras:\n${JSON.stringify(data)}`
          : entity?.[0]?.prompt;

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "Eres un asistente virtual, que se limita a responder con la estructura definida.",
            },
            {
              role: "user",
              content: fullPrompt.trim(),
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: `schema_${projectId}`,
              description: `A structured object with company data ${projectId}`,
              schema,
              strict: true,
            },
          },
        });

        const parsed = JSON.parse(response.choices[0].message.content.trim());
        ctx.send(parsed);
      } catch (err) {
        strapi.log.error("OpenAI error:", err);
        ctx.send({ error: err.message }, 500);
      }
    },
    async generateImage(ctx) {
      try {
        const { prompt, size = "1024x1024", n = 1 } = ctx.request.body;

        if (!prompt) {
          ctx.send({ error: "Prompt requerido" }, 400);
          return;
        }

        const imageResponse = await openai.images.generate({
          prompt,
          n,
          size,
        });

        ctx.send({ images: imageResponse.data });
      } catch (err) {
        strapi.log.error("Error generando imagen:", err);
        ctx.send({ error: err.message }, 500);
      }
    },
  })
);
