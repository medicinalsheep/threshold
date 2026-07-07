import { stripCodeFences } from './agentPrompts.js';

const WORLD_MUTATING = /World\.(createObject|clearWorld|addCustom|spawn)|State\.objects\.push/;

function hasIife(code) {
    return /\(function\s*\(|^\s*\(async\s+function/.test(code.trim());
}

function hasTryCatch(code) {
    return /try\s*\{/.test(code);
}

function hasEditGuard(code) {
    return /State\.isPaused|EDIT_ONLY|Pause \(EDIT\)/i.test(code);
}

/** Prepare raw LLM output for Compiler RUN IN ENGINE. */
export function sanitizeSceneCode(raw) {
    let code = stripCodeFences(raw);
    if (!code) return '';

    code = code.replace(/scene\.add\s*\([^;]+\);?/gi, '// removed: use World.createObject instead');
    code = code.replace(/new THREE\.Mesh\(\s*new THREE\.BoxGeometry[^)]*\)/gi, "World.createObject('cube')");
    code = code.replace(/new THREE\.Mesh\(\s*new THREE\.SphereGeometry[^)]*\)/gi, "World.createObject('sphere')");
    code = code.replace(/new THREE\.Scene\s*\(\s*\)/gi, '// removed: scene already exists');
    code = code.replace(/renderer\.render\s*\([^)]*\);?/gi, '// removed: Engine handles render loop');

    const mutates = WORLD_MUTATING.test(code);
    const needsGuard = mutates && !hasEditGuard(code);
    const needsTry = !hasTryCatch(code);
    const needsRenderMode = mutates && !/Engine\.setRenderMode/.test(code);

    let body = code;
    if (!hasIife(body)) {
        const lines = [];
        if (needsGuard) lines.push("if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); return; }");
        if (needsRenderMode) lines.push('Engine.setRenderMode(4);');
        lines.push(body);
        body = lines.join('\n    ');
        if (needsTry) {
            body = `try {\n    ${body}\n  } catch (e) { console.error(e); UI.status('Error: ' + e.message); }`;
        }
        code = `(function() {\n  ${body}\n})();`;
    } else if (needsTry || needsGuard || needsRenderMode) {
        const insert = [];
        if (needsGuard) insert.push("if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); return; }");
        if (needsRenderMode) insert.push('Engine.setRenderMode(4);');
        if (insert.length) {
            code = code.replace(/(\(function\s*\(\)\s*\{)/, `$1\n  ${insert.join('\n  ')}`);
        }
        if (needsTry && !hasTryCatch(code)) {
            code = code.replace(/(\(function\s*\(\)\s*\{)([\s\S]*)(\}\)\s*\(\s*\)\s*;?\s*$)/, (m, open, inner, close) => {
                return `${open}\n  try {${inner}\n  } catch (e) { console.error(e); UI.status('Error: ' + e.message); }\n${close}`;
            });
        }
    }

    return code.trim();
}

export function codeReadinessSummary(code) {
    const c = code || '';
    return {
        hasCode: c.trim().length > 8,
        hasIife: hasIife(c),
        usesWorldApi: /World\.|PlayerController\.|State\.|Engine\./.test(c),
        noRawScene: !/scene\.add\s*\(/.test(c),
        hasTryCatch: hasTryCatch(c),
        hasEditGuard: hasEditGuard(c) || !WORLD_MUTATING.test(c),
        noClearWorld: !/World\.clearWorld/.test(c),
    };
}