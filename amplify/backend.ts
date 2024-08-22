import { defineBackend } from "@aws-amplify/backend";
import { Duration } from "aws-cdk-lib";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import {
  Architecture,
  FunctionUrlAuthType,
  InvokeMode,
  Runtime,
} from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { fileURLToPath } from "node:url";
import { auth } from "./auth/resource";

const backend = defineBackend({ auth });

const customResourceStack = backend.createStack("MyCustomResources");

const bedrockPolicy = new PolicyStatement({
  actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
  effect: Effect.ALLOW,
  resources: [
    `arn:aws:bedrock:${customResourceStack.region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
    `arn:aws:bedrock:${customResourceStack.region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`,
    `arn:aws:bedrock:${customResourceStack.region}::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0`,
  ],
});

const aiFunction = new NodejsFunction(customResourceStack, "AiFunction", {
  entry: fileURLToPath(new URL("custom/functions/ai.ts", import.meta.url)),
  architecture: Architecture.ARM_64,
  runtime: Runtime.NODEJS_20_X,
  timeout: Duration.seconds(60),
  bundling: {
    externalModules: [],
  },
  environment: {
    USER_POOL_ID: backend.auth.resources.userPool.userPoolId,
    CLIENT_ID: backend.auth.resources.userPoolClient.userPoolClientId,
  },
});

aiFunction.addToRolePolicy(bedrockPolicy);

const aiFunctionUrl = aiFunction.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  invokeMode: InvokeMode.RESPONSE_STREAM,
});

const langchainFunction = new NodejsFunction(
  customResourceStack,
  "LangchainFunction",
  {
    entry: fileURLToPath(
      new URL("custom/functions/langchain.ts", import.meta.url)
    ),
    architecture: Architecture.ARM_64,
    runtime: Runtime.NODEJS_20_X,
    timeout: Duration.seconds(60),
    bundling: {
      externalModules: [],
    },
    environment: {
      USER_POOL_ID: backend.auth.resources.userPool.userPoolId,
      CLIENT_ID: backend.auth.resources.userPoolClient.userPoolClientId,
    },
  }
);

langchainFunction.addToRolePolicy(bedrockPolicy);

const langchainFunctionUrl = langchainFunction.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  invokeMode: InvokeMode.RESPONSE_STREAM,
});

backend.addOutput({
  custom: {
    aiFunctionUrl: aiFunctionUrl.url,
    langchainFunctionUrl: langchainFunctionUrl.url,
  },
});
