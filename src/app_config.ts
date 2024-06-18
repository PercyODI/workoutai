import { injectable } from "inversify";
import { IAppConfig } from "./IAppConfig";

@injectable()
export class AppConfig implements IAppConfig {
    public readonly openaiHost: string;
    public readonly openaiKey: string;

    constructor() {
        this.openaiKey = process.env.OPENAI_API_KEY || ""
        this.openaiHost = process.env.OPENAI_API_HOST || ""
    }
}