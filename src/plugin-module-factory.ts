import * as ts from 'typescript/lib/tsserverlibrary';
import { VscodeLanguageServiceAdapter, ScriptSourceHelper } from './vscode-language-service-adapter';
import { LanguageServiceProxyBuilder } from './ts-util/language-service-proxy-builder';
import { findAllNodes, findNode } from './ts-util/nodes';

function create(info: ts.server.PluginCreateInfo): ts.LanguageService {
    const logger = (msg: string) => info.project.projectService.logger.info(`[ts-css-plugin] ${msg}`);
    logger('config: ' + JSON.stringify(info.config));
    const getNode = (fileName: string, position: number) => {
        return findNode(info.languageService.getProgram().getSourceFile(fileName), position);
    };
    const getAllNodes = (fileName: string, cond: (n: ts.Node) => boolean) => {
        const s = info.languageService.getProgram().getSourceFile(fileName);
        return findAllNodes(s, cond);
    };
    const getLineAndChar = (fileName: string, position: number) => {
        const s = info.languageService.getProgram().getSourceFile(fileName);
        return ts.getLineAndCharacterOfPosition(s, position);
    };

    const getOffset = (fileName: string, line: number, character: number) => {
        const s = info.languageService.getProgram().getSourceFile(fileName);
        return ts.getPositionOfLineAndCharacter(s, line, character);
    };
    const helper: ScriptSourceHelper = {
        getNode,
        getAllNodes,
        getLineAndChar,
        getOffset,
    };
    const tag = info.config.tag;
    const adapter = new VscodeLanguageServiceAdapter(helper, { logger, tag });

    const proxy = new LanguageServiceProxyBuilder(info)
        .wrap('getCompletionsAtPosition', delegate => adapter.getCompletionAtPosition.bind(adapter, delegate))
        .wrap('getSemanticDiagnostics', delegate => adapter.getSemanticDiagnostics.bind(adapter, delegate))
        .wrap('getQuickInfoAtPosition', delegate => adapter.getQuickInfoAtPosition.bind(adapter, delegate))
        .build();

    return proxy;
}

const moduleFactory /*:ts.server.PluginModuleFactory*/ = (mod: { typescript: typeof ts }) => {
    return { create };
};

export default moduleFactory;
