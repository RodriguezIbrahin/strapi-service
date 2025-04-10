/**
 * open-ai router
 */

export default {
  routes: [
    {
      method: "POST",
      path: "/open-ai/:projectId",
      handler: "open-ai.generateData",
      config: {
        auth: false,
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/open-ai/:id",
      handler: "open-ai.findOne",
      config: { auth: false },
    },
  ],
};
