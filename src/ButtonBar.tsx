import { memo, ReactNode } from "react";
import { tss } from "./lib/tss";
import { useCallbackFactory } from "powerhooks/useCallbackFactory";
import { ButtonBarButton } from "./ButtonBarButton";
import { symToStr } from "tsafe/symToStr";

export type ButtonBarProps<ButtonId extends string = never> = {
    className?: string;
    buttons: ButtonBarProps.Button<ButtonId>[];
    onClick: (buttonId: ButtonId) => void;
};

export namespace ButtonBarProps {
    export type Button<ButtonId extends string> =
        | Button.Callback<ButtonId>
        | Button.Link;

    export namespace Button {
        type Common = {
            icon: string;
            label: ReactNode;
            isDisabled?: boolean;
        };

        export type Callback<ButtonId extends string> = Common & {
            buttonId: ButtonId;
        };

        export type Link = Common & {
            link: {
                href: string;
                onClick?: (event?: any) => void;
                target?: "_blank";
            };
        };
    }
}

function NonMemoizedButtonBar<ButtonId extends string>(
    props: ButtonBarProps<ButtonId>,
) {
    const { className, buttons, onClick } = props;

    const { classes, cx } = useStyles();

    const onClickFactory = useCallbackFactory(([buttonId]: [ButtonId]) =>
        onClick(buttonId),
    );

    return (
        <div className={cx(classes.root, className)}>
            {buttons.map(button => (
                <ButtonBarButton
                    startIcon={button.icon}
                    disabled={button.isDisabled ?? false}
                    {...("link" in button
                        ? {
                              "key": button.link.href,
                              "href": button.link.href,
                              "onClick": button.link.onClick,
                              "doOpenNewTabIfHref":
                                  button.link.target === "_blank",
                          }
                        : {
                              "key": button.buttonId,
                              "onClick": onClickFactory(button.buttonId),
                          })}
                >
                    {button.label}
                </ButtonBarButton>
            ))}
        </div>
    );
}

export const ButtonBar = memo(NonMemoizedButtonBar) as <
    ButtonId extends string = never,
>(
    props: ButtonBarProps<ButtonId>,
) => ReturnType<typeof NonMemoizedButtonBar>;

(ButtonBar as any).displayName = symToStr({ ButtonBar });

const useStyles = tss.withName({ ButtonBar }).create(({ theme }) => ({
    "root": {
        "backgroundColor": theme.colors.useCases.surfaces.surface1,
        "boxShadow": theme.shadows[1],
        "borderRadius": 8,
        "overflow": "hidden",
    },
}));
