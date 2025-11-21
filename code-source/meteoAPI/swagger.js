const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

//tags: [
  //{
    //name: "Data",
    //description: "Endpoints pour les données météorologiques"
  //}
//]


const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "URGmetEO API",
      version: "1.0.0",
      description: "Documentation de l’API météo URGmetEO",
      contact: {
        name: "URGEO",
        email: "contact@urgeo.ht"
      }
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Serveur local"
      }
    ]
  },
  apis: ["./routes/*.js", "./models/*.js"], // Important !
};

const swaggerSpec = swaggerJsDoc(options);

function swaggerDocs(app) {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log("📘 Swagger disponible : http://localhost:3000/api/docs");
}

module.exports = swaggerDocs;
