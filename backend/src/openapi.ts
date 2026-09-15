/**
 * Minimal OpenAPI 3 document for the v1 API.
 * Proposed RBAC codes are documented as proposed until live recon reconciles them.
 */
export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Musooka API",
    version: "1.0.0",
    description:
      "Production-foundation API for the Musooka requisition tracker. Permissions and lifecycle statuses are proposed until reconciled with live Musooka.",
  },
  servers: [{ url: "http://127.0.0.1:4000", description: "Local development" }],
  components: {
    securitySchemes: {
      cookieAuth: { type: "apiKey", in: "cookie", name: "musooka_sid" },
      bearerAuth: { type: "http", scheme: "bearer" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: {},
            },
            required: ["code", "message"],
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string" },
          name: { type: "string" },
          status: { type: "string" },
          roles: { type: "array", items: { type: "string" } },
          permissions: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
  paths: {
    "/api/v1/auth/login": {
      post: {
        summary: "Login",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Authenticated" },
          "401": { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/v1/auth/logout": {
      post: { summary: "Logout", tags: ["Auth"], responses: { "204": { description: "Logged out" } } },
    },
    "/api/v1/auth/me": {
      get: {
        summary: "Current user",
        tags: ["Auth"],
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { "200": { description: "Current user" }, "401": { description: "Unauthenticated" } },
      },
    },
    "/api/v1/requisitions": {
      get: {
        summary: "List requisitions",
        tags: ["Requisitions"],
        description: "Requires proposed permission `requisition.view`.",
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { "200": { description: "List" }, "403": { description: "Forbidden" } },
      },
      post: {
        summary: "Create requisition",
        tags: ["Requisitions"],
        description: "Requires proposed permission `requisition.create`.",
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { "201": { description: "Created" } },
      },
    },
    "/api/v1/requisitions/{id}": {
      get: {
        summary: "Get requisition",
        tags: ["Requisitions"],
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Requisition" }, "404": { description: "Not found" } },
      },
    },
    "/api/v1/requisitions/{id}/approve": {
      post: {
        summary: "Approve requisition",
        tags: ["Approvals"],
        description: "Requires proposed permission `requisition.approve`. Enforced server-side.",
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Approved" },
          "403": { description: "Forbidden" },
          "422": { description: "Invalid lifecycle transition" },
        },
      },
    },
    "/api/v1/users": {
      get: {
        summary: "List users",
        tags: ["Users"],
        description: "Requires `user.view`.",
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { "200": { description: "Users" } },
      },
      post: {
        summary: "Create user",
        tags: ["Users"],
        description: "Requires `user.manage`.",
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { "201": { description: "Created" }, "403": { description: "Forbidden" } },
      },
    },
    "/api/v1/roles": {
      get: {
        summary: "List roles",
        tags: ["Roles"],
        description: "Requires `role.view`.",
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { "200": { description: "Roles" } },
      },
    },
    "/api/v1/permissions": {
      get: {
        summary: "List permissions",
        tags: ["Roles"],
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { "200": { description: "Permissions" } },
      },
    },
    "/api/v1/reports/dashboard": {
      get: {
        summary: "Dashboard metrics",
        tags: ["Reports"],
        description: "Requires `report.view`.",
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { "200": { description: "Metrics" } },
      },
    },
    "/api/v1/notifications": {
      get: {
        summary: "Current user notifications",
        tags: ["Notifications"],
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: { "200": { description: "Notifications" } },
      },
    },
    "/health": { get: { summary: "Liveness", tags: ["Ops"], responses: { "200": { description: "Alive" } } } },
    "/ready": { get: { summary: "Readiness (DB)", tags: ["Ops"], responses: { "200": { description: "Ready" }, "503": { description: "DB unavailable" } } } },
  },
};
