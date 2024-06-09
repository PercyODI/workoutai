import { injectable } from "inversify";
import { IAppConfig } from "./IAppConfig";

@injectable()
export class AppConfig implements IAppConfig {
    public readonly openaiKey: string;

    constructor() {
        this.openaiKey = process.env.OPENAI_KEY || ""
    }
}