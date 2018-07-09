// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as ts from 'typescript/lib/tsserverlibrary';
import { StyledPlugin } from './_plugin';

export = (mod: { typescript: typeof ts }) =>
    new StyledPlugin(mod.typescript);
