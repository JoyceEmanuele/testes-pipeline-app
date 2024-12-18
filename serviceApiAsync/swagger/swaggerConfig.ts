export const swaggerConfig = {
	swaggerDefinition: {
	   "info":{
	      "version":"1.0.0",
	      "title":"API Server",
	      "description":"API Server Documentation",
	      "license":{
	         "name":"MIT",
	         "url":"https://opensource.org/licenses/MIT"
	      },
	    },
		"servers":[
			{
				"url":"https://api-qa.dielenergia.com",
				"description":"Api-server"
			}
		],
	   "securityDefinitions":{
	      "Bearer":{
	         "type":"apiKey",
	         "name":"Authorization",
	         "in":"header",
	         "description":"Digite o token com o 'Bearer '. Ex: 'Bearer seu.token.aqui'"
	      }
	   },
	   "responses":{
	      "UnauthorizedError":{
	         "description":"O token de acesso não foi enviado ou é invalido."
	      }
	   }
	},
	"apis": ["./*/*.ts", "./*/*/*.ts", "./*/*/*/*.ts"]
}
