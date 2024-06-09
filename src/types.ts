import { interfaces } from "inversify";
import { Persona, PersonaProps } from "./components/persona";

export const PersonaFactory = Symbol.for("PersonaFactory")
export type TPersonaFactory = (props: PersonaProps) => Persona

export const TYPES = {
    IAppConfig: Symbol.for("IAppConfig"),
    NewablePersona: Symbol.for("NewablePersona")
}