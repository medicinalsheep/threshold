/** Sprint J — tag starter props as survival interactables */

const HOOKS_BY_ID = [
    {
        id: 'starter_interior_coffee',
        survivalKind: 'food',
        interactAction: 'survival',
        interactLabel: 'Coffee Nook',
        interactHint: 'Grab coffee — food + calm',
        interactRadius: 2.4,
    },
    {
        id: 'starter_creek',
        survivalKind: 'water',
        interactAction: 'survival',
        interactLabel: 'Creek',
        interactHint: 'Drink creek water',
        interactRadius: 3.2,
    },
    {
        id: 'starter_shop_counter',
        survivalKind: 'snack',
        interactAction: 'survival',
        interactLabel: 'Shop Counter',
        interactHint: 'Quick snack',
        interactRadius: 2.2,
    },
    {
        id: 'starter_bench',
        survivalKind: 'rest',
        interactAction: 'survival',
        interactLabel: 'Bench',
        interactHint: 'Sit and rest',
        interactRadius: 2.0,
    },
];

const HOOKS_BY_NAME = [
    {
        name: 'starter_tesla_bench',
        survivalKind: 'rest',
        interactAction: 'survival',
        interactLabel: 'Lab Bench',
        interactHint: 'Rest at the instrument bench',
        interactRadius: 2.3,
    },
];

function applyHook(target, hook) {
    if (!target?.userData) return false;
    const ud = target.userData;
    if (ud.survivalKind === hook.survivalKind && ud.interactAction === 'survival') return false;
    Object.assign(ud, {
        survivalKind: hook.survivalKind,
        interactAction: hook.interactAction,
        interactLabel: hook.interactLabel,
        interactHint: hook.interactHint,
        interactRadius: hook.interactRadius,
    });
    return true;
}

export function applySurvivalWorldHooks() {
    const State = window.State;
    const Engine = window.Engine;
    if (!State || !Engine?.scene) return { patched: 0 };

    let patched = 0;

    HOOKS_BY_ID.forEach((hook) => {
        const obj = State.objects.find((o) => o.userData?.id === hook.id);
        if (obj && applyHook(obj, hook)) patched += 1;
    });

    HOOKS_BY_NAME.forEach((hook) => {
        let node = null;
        Engine.scene.traverse((c) => {
            if (!node && c.name === hook.name) node = c;
        });
        if (node && applyHook(node, hook)) patched += 1;
    });

    return { patched };
}

window.applySurvivalWorldHooks = applySurvivalWorldHooks;