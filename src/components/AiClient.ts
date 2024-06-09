import { inject } from "inversify";
import { TYPES } from "../types";
import { IAppConfig } from "../IAppConfig";
import OpenAI from "openai";

export class AiClient {
    private openAi: OpenAI;
    constructor(@inject(TYPES.IAppConfig) appConfig: IAppConfig){
        this.openAi = new OpenAI({
            apiKey: appConfig.openaiKey
        })
    }
}