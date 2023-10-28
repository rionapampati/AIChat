import { BaseOutputParser } from 'langchain/schema/output_parser'
import { LLMChain } from 'langchain/chains'
import { BaseLanguageModel } from 'langchain/base_language'
import { ICommonObject } from '../../src'
import { ChatPromptTemplate, FewShotPromptTemplate, PromptTemplate, SystemMessagePromptTemplate } from 'langchain/prompts'

export const CATEGORY = 'Output Parser (Experimental)'

export const applyOutputParser = async (response: string, outputParser: BaseOutputParser | undefined): Promise<string | object> => {
    if (outputParser) {
        const parsedResponse = await outputParser.parse(response)
        // eslint-disable-next-line no-console
        console.log('**** parsedResponse ****', parsedResponse)
        if (typeof parsedResponse === 'object') {
            return { json: parsedResponse }
        }
        return parsedResponse as string
    }
    return response
}

export const injectOutputParser = (
    outputParser: BaseOutputParser<unknown>,
    chain: LLMChain<string, BaseLanguageModel>,
    promptValues: ICommonObject | undefined = undefined
) => {
    if (outputParser && chain.prompt) {
        const formatInstructions = outputParser.getFormatInstructions()
        if (chain.prompt instanceof PromptTemplate) {
            let pt = chain.prompt
            pt.template = pt.template + '\n{format_instructions}'
            chain.prompt.partialVariables = { format_instructions: formatInstructions }
        } else if (chain.prompt instanceof ChatPromptTemplate) {
            let pt = chain.prompt
            pt.promptMessages.forEach((msg) => {
                if (msg instanceof SystemMessagePromptTemplate) {
                    ;(msg.prompt as any).partialVariables = { format_instructions: outputParser.getFormatInstructions() }
                    ;(msg.prompt as any).template = ((msg.prompt as any).template + '\n{format_instructions}') as string
                }
            })
        } else if (chain.prompt instanceof FewShotPromptTemplate) {
            chain.prompt.examplePrompt.partialVariables = { format_instructions: formatInstructions }
            chain.prompt.examplePrompt.template = chain.prompt.examplePrompt.template + '\n{format_instructions}'
        }

        chain.prompt.inputVariables.push('format_instructions')
        if (promptValues) {
            promptValues = { ...promptValues, format_instructions: outputParser.getFormatInstructions() }
        }
    }
    return promptValues
}