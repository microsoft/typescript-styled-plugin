// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as ts from 'typescript/lib/tsserverlibrary';
import { LanguageServiceFactory } from './language-service-factory';
import { StyledVirtualDocumentFactory } from './virtual-document-factory';

export = (mod: { typescript: typeof ts }) =>
    new LanguageServiceFactory(
        mod.typescript,
        new StyledVirtualDocumentFactory());
