import { inject, injectable } from "inversify";
import { IAppConfig } from "../IAppConfig";
import { TYPES } from "../types";
import OpenAI from "openai";
import { ChatHistory } from "./ChatHistory";

export type PersonaProps = {
    name: string;
    role: string;
    description: string;
}

@injectable()
export class Persona {
    public name: string
    private systemMessage: string
    openAi: OpenAI;
    constructor(@inject(TYPES.IAppConfig) private appConfig: IAppConfig, props: PersonaProps) {
        this.name = props.name

        this.systemMessage = `You are taking on the persona of a ${props.role}, with the name ${props.name}.\n`
        this.systemMessage += `Persona description: ${props.description}`;

        this.openAi = new OpenAI({
            apiKey: appConfig.openaiKey
        })
    }

    async receiveMeetingAndMaybeRespond(meetingHistory: ChatHistory) {
        const params: OpenAI.Chat.ChatCompletionCreateParams = {
            messages: [{
                role: "system",
                content: this.systemMessage
            }, {
                role: "user",
                content: "Meeting so far: \n" +
                    meetingHistory.historyToString() +
                    "\n You may choose to respond, or simply say 'pass' to not add to the meeting."
            }],
            model: "gpt-4o",
            stream: true
        }

        const chatCompletionStream = await this.openAi.chat.completions.create(params);

        process.stdout.write("\n\n## " + this.name + "\n---\n")
        let retVal = ""
        for await (const chunk of chatCompletionStream) {
            const newStr = chunk.choices[0]?.delta.content
            if (newStr) {
                process.stdout.write(newStr)
                retVal += newStr
            }
        }

        if (retVal !== 'pass') {
            meetingHistory.addChat(this, retVal)
        }
    }

    async startChatAsSelf(initPrompt: string) {
        const params: OpenAI.Chat.ChatCompletionCreateParams = {
            messages: [{
                role: "system",
                content: this.systemMessage
            }, {
                role: "user",
                content: "In your own words and voice, introduce this topic to start the meeting: " + initPrompt
            }],
            model: "gpt-4o",
            stream: true
        };

        const chatCompletionStream = await this.openAi.chat.completions.create(params);

        let retVal = ""
        process.stdout.write("## " + this.name + "\n---\n")
        for await (const chunk of chatCompletionStream) {
            const newStr = chunk.choices[0]?.delta.content
            if (newStr) {
                process.stdout.write(newStr)
                retVal += newStr
            }
        }

        const chatHist = new ChatHistory()
        chatHist.addChat(this, retVal);

        return chatHist;
    }

    async introduceSelf() {
        const params: OpenAI.Chat.ChatCompletionCreateParams = {
            messages: [{
                role: "system",
                content: this.systemMessage
            }, {
                role: "user",
                content: "Introduce yourself to the rest of the group."
            }],
            model: "gpt-4o",
            stream: true
        };

        const chatCompletionStream = await this.openAi.chat.completions.create(params);

        let retVal = ""
        for await (const chunk of chatCompletionStream) {
            const newStr = chunk.choices[0]?.delta.content
            if (newStr) {
                process.stdout.write(newStr)
                retVal += newStr
            }
        }
    }
}