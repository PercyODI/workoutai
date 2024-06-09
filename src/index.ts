import 'dotenv/config'
import "reflect-metadata"
import { AppConfig } from "./app_config";
import { Workflow } from "./workflow";
import { IAppConfig } from "./IAppConfig";
import { Container, interfaces } from "inversify";
import { Persona, PersonaProps } from "./components/persona";
import { PersonaFactory, TYPES } from "./types";

const container = new Container();
container.bind<IAppConfig>(TYPES.IAppConfig).to(AppConfig);
container.bind<Workflow>(Workflow).to(Workflow)
container.bind<interfaces.Factory<Persona>>(PersonaFactory).toFactory<Persona, [PersonaProps]>((context: interfaces.Context) => {
    return (props: PersonaProps) => {
        return new Persona(context.container.get<IAppConfig>(TYPES.IAppConfig), props);
    }
})

    ; (async () => {
        const workflow = container.get<Workflow>(Workflow);
        await workflow.run();
    })()