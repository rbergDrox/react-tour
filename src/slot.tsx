import { cloneElement, forwardRef, isValidElement } from 'react';
import type { CSSProperties, ReactElement, ReactNode, Ref } from 'react';

type AnyProps = Record<string, unknown>;

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
    if (typeof ref === 'function') {
        ref(value);
    } else if (ref) {
        (ref as { current: T | null }).current = value;
    }
}

/**
 * React 19 passes `ref` as a regular prop; React 18 keeps it on the element.
 * Reading the prop first avoids the deprecation warning 19 logs for
 * `element.ref`.
 */
function childRef(child: ReactElement): Ref<unknown> | undefined {
    const fromProps = (child.props as AnyProps).ref as Ref<unknown> | undefined;

    return (
        fromProps ??
        (child as unknown as { ref?: Ref<unknown> }).ref ??
        undefined
    );
}

function mergeProps(slotProps: AnyProps, childProps: AnyProps): AnyProps {
    const merged: AnyProps = { ...slotProps, ...childProps };

    for (const key of Object.keys(slotProps)) {
        const slotValue = slotProps[key];
        const childValue = childProps[key];

        if (/^on[A-Z]/.test(key)) {
            if (
                typeof slotValue === 'function' &&
                typeof childValue === 'function'
            ) {
                merged[key] = (...args: unknown[]) => {
                    childValue(...args);
                    slotValue(...args);
                };
            } else {
                merged[key] = childValue ?? slotValue;
            }
        } else if (key === 'style') {
            merged[key] = {
                ...(slotValue as CSSProperties),
                ...(childValue as CSSProperties),
            };
        } else if (key === 'className') {
            merged[key] =
                [slotValue, childValue].filter(Boolean).join(' ') || undefined;
        }
    }

    return merged;
}

/**
 * Renders its single child with the slot's props merged onto it, so nothing
 * extra lands in the DOM. Returns `null` when the child is not a single React
 * element, which the caller treats as "wrap it instead".
 */
export const Slot = forwardRef<
    unknown,
    { children: ReactNode } & Record<string, unknown>
>(function Slot({ children, ...slotProps }, forwardedRef) {
    if (!isValidElement(children)) {
        return null;
    }

    const child = children as ReactElement<AnyProps>;
    const ownRef = childRef(child);

    return cloneElement(child, {
        ...mergeProps(slotProps, child.props),
        ref: (node: unknown) => {
            assignRef(forwardedRef, node);
            assignRef(ownRef, node);
        },
    } as AnyProps);
});
