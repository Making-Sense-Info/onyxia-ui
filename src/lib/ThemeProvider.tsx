/* eslint-disable @typescript-eslint/ban-types */
import { useContext, createContext, useCallback } from "react";
import type { ReactNode } from "react";
import type { Theme as MuiTheme } from "@material-ui/core";
import CssBaseline from "@material-ui/core/CssBaseline";
import { ThemeProvider as MuiThemeProvider } from "@material-ui/core/styles";
import {
    createTheme as createMuiTheme,
    unstable_createMuiStrictModeTheme,
} from "@material-ui/core/styles";
import { useWindowInnerSize } from "powerhooks/useWindowInnerSize";
import type {
    PaletteBase,
    ColorUseCasesBase,
    CreateColorUseCase,
} from "./color";
import {
    defaultPalette,
    createDefaultColorUseCases,
    useIsDarkModeEnabled,
    evtIsDarkModeEnabled,
} from "./color";
import type { ComputedTypography, GetTypographyDesc } from "./typography";
import {
    defaultGetTypographyDesc,
    createMuiTypographyOptions,
    getComputedTypography,
} from "./typography";
import { createMuiPaletteOptions } from "./color";
import { shadows } from "./shadows";
import { useBrowserFontSizeFactor } from "powerhooks/useBrowserFontSizeFactor";
import { defaultSpacingConfig } from "./spacing";
import type { SpacingConfig, Spacing } from "./spacing";
import { createMakeStyles } from "tss-react";
import type { IconSizeName, GetIconSizeInPx } from "./icon";
import { defaultGetIconSizeInPx, getIconSizesInPxByName } from "./icon";
import { createSplashScreen } from "./SplashScreen";
import type { SplashScreenProps } from "./SplashScreen";
import {
    ViewPortAdapter,
    ViewPortOutOfRangeError,
} from "powerhooks/ViewPortAdapter";
import type { ViewPortAdapterProps } from "powerhooks/ViewPortAdapter";
import { assert } from "tsafe/assert";
import memoize from "memoizee";
import { id } from "tsafe/id";
import { breakpointsValues } from "./breakpoints";
import { EmotionCache } from "@emotion/react";
import { capitalize } from "tsafe/capitalize";
import "minimal-polyfills/Object.fromEntries";

export { useDomRect } from "powerhooks/useDomRect";
export { useWindowInnerSize, useBrowserFontSizeFactor };
export { ViewPortOutOfRangeError };
import { CacheProvider } from "@emotion/react";
import { getCache } from "tss-react/cache";

export type Theme<
    Palette extends PaletteBase = PaletteBase,
    ColorUseCases extends ColorUseCasesBase = ColorUseCasesBase,
    CustomTypographyVariantName extends string = never,
    Custom extends Record<string, unknown> = Record<string, unknown>,
> = {
    colors: {
        palette: Palette;
        useCases: ColorUseCases;
    };
    isDarkModeEnabled: boolean;
    typography: ComputedTypography<CustomTypographyVariantName>;
    shadows: typeof shadows;
    spacing: Spacing;
    muiTheme: MuiTheme;
    custom: Custom;
    iconSizesInPxByName: Record<IconSizeName, number>;
    windowInnerWidth: number;
};

const themeBaseContext = createContext<Theme | undefined>(undefined);

/** Used internally, do not export globally */

export function useIsThemeProvided(): boolean {
    const theme = useContext(themeBaseContext);

    return theme !== undefined;
}

function useThemeBase() {
    const theme = useContext(themeBaseContext);

    if (theme === undefined) {
        throw new Error("Your app should be wrapped into ThemeProvider");
    }

    return theme;
}

export const { makeStyles, useStyles } = createMakeStyles({
    "useTheme": useThemeBase,
});

export type ThemeProviderProps = {
    children: ReactNode;
    /** NOTE: Each time the callback's ref update the
     * the callback will be invoked again, it's best
     * a cont callback */
    getViewPortConfig?: ViewPortAdapterProps["getConfig"];
    splashScreen?: Omit<SplashScreenProps, "children">;
};

export declare namespace ThemeProviderProps {
    type WithChildren = {
        children: ReactNode;
    };

    export type WithZoom = {
        zoomProviderReferenceWidth?: number;

        /**
         * Message to display when portrait mode, example:
         *    This app isn't compatible with landscape mode yet,
         *    please enable the rotation sensor and flip your phone.
         */
        portraitModeUnsupportedMessage?: ReactNode;
    } & WithChildren;

    export type WithoutZoom = WithChildren;
}

export function createThemeProvider<
    Palette extends PaletteBase = PaletteBase,
    ColorUseCases extends ColorUseCasesBase = ColorUseCasesBase,
    CustomTypographyVariantName extends string = never,
    Custom extends Record<string, unknown> = Record<string, unknown>,
>(params: {
    isReactStrictModeEnabled?: boolean;
    getTypographyDesc?: GetTypographyDesc<CustomTypographyVariantName>;
    palette?: Palette;
    createColorUseCases?: CreateColorUseCase<Palette, ColorUseCases>;
    spacingConfig?: SpacingConfig;
    custom?: Custom;
    defaultIsDarkModeEnabled?: boolean;
    getIconSizeInPx?: GetIconSizeInPx;
    cache?: EmotionCache;
}) {
    const {
        palette = defaultPalette as NonNullable<typeof params["palette"]>,
        createColorUseCases = createDefaultColorUseCases as unknown as NonNullable<
            typeof params["createColorUseCases"]
        >,
        getTypographyDesc = defaultGetTypographyDesc as NonNullable<
            typeof params["getTypographyDesc"]
        >,
        isReactStrictModeEnabled = false,
        spacingConfig = defaultSpacingConfig,
        custom = {} as NonNullable<typeof params["custom"]>,
        defaultIsDarkModeEnabled,
        getIconSizeInPx = defaultGetIconSizeInPx,
        cache = getCache(),
    } = params;

    if (defaultIsDarkModeEnabled !== undefined) {
        evtIsDarkModeEnabled.state = defaultIsDarkModeEnabled;
    }

    const { useTheme } = (() => {
        const createTheme = memoize(
            (
                isDarkModeEnabled: boolean,
                windowInnerWidth: number,
                windowInnerHeight: number,
                browserFontSizeFactor: number,
            ) => {
                const typographyDesc = getTypographyDesc({
                    windowInnerWidth,
                    windowInnerHeight,
                    browserFontSizeFactor,
                });
                const useCases = createColorUseCases({
                    palette,
                    isDarkModeEnabled,
                });

                const spacing = (
                    factorOrExplicitNumberOfPx: number | `${number}px`,
                ) =>
                    spacingConfig({
                        factorOrExplicitNumberOfPx,
                        windowInnerWidth,
                        "rootFontSizePx": typographyDesc.rootFontSizePx,
                    });

                return id<
                    Theme<
                        Palette,
                        ColorUseCases,
                        CustomTypographyVariantName,
                        Custom
                    >
                >({
                    "colors": { palette, useCases },
                    "typography": getComputedTypography({ typographyDesc }),
                    isDarkModeEnabled,
                    shadows,
                    ...(() => {
                        const muiTheme = (
                            isReactStrictModeEnabled
                                ? unstable_createMuiStrictModeTheme
                                : createMuiTheme
                        )({
                            // https://material-ui.com/customization/palette/#using-a-color-object
                            "typography": createMuiTypographyOptions({
                                typographyDesc,
                            }),
                            "palette": createMuiPaletteOptions({
                                isDarkModeEnabled,
                                palette,
                                useCases,
                            }),
                            spacing,
                            "breakpoints": {
                                "values": { "xs": 0, ...breakpointsValues },
                            },
                        });

                        return {
                            "spacing": (() => {
                                const toFinalValue = (value: number | string) =>
                                    typeof value === "number"
                                        ? `${spacing(value)}px`
                                        : value;

                                const out = ((
                                    valueOrObject:
                                        | number
                                        | Record<
                                              "topBottom" | "rightLeft",
                                              number | string
                                          >,
                                ): string | number => {
                                    if (typeof valueOrObject === "number") {
                                        return spacing(valueOrObject);
                                    }

                                    const { rightLeft, topBottom } =
                                        valueOrObject;

                                    return [
                                        topBottom,
                                        rightLeft,
                                        topBottom,
                                        rightLeft,
                                    ]
                                        .map(toFinalValue)
                                        .join(" ");
                                }) as any as Spacing;

                                const f = (params: {
                                    axis: "vertical" | "horizontal";
                                    kind: "padding" | "margin";
                                    value: number | string;
                                }): Record<string, string> => {
                                    const { axis, kind, value } = params;

                                    const finalValue =
                                        typeof value === "number"
                                            ? `${spacing(value)}px`
                                            : value;

                                    return Object.fromEntries(
                                        (() => {
                                            switch (axis) {
                                                case "horizontal":
                                                    return ["left", "right"];
                                                case "vertical":
                                                    return ["top", "bottom"];
                                            }
                                        })().map(direction => [
                                            `${kind}${capitalize(direction)}`,
                                            finalValue,
                                        ]),
                                    );
                                };

                                out.rightLeft = (kind, value) =>
                                    f({ "axis": "horizontal", kind, value });
                                out.topBottom = (kind, value) =>
                                    f({ "axis": "vertical", kind, value });

                                return out;
                            })(),
                            muiTheme,
                        };
                    })(),
                    "iconSizesInPxByName": getIconSizesInPxByName({
                        getIconSizeInPx,
                        windowInnerWidth,
                        "rootFontSizePx": typographyDesc.rootFontSizePx,
                    }),
                    windowInnerWidth,
                    custom,
                });
            },
            { "max": 1 },
        );

        function useTheme() {
            const { isDarkModeEnabled } = useIsDarkModeEnabled();
            const { windowInnerWidth, windowInnerHeight } =
                useWindowInnerSize();
            const { browserFontSizeFactor } = useBrowserFontSizeFactor();

            return createTheme(
                isDarkModeEnabled,
                windowInnerWidth,
                windowInnerHeight,
                browserFontSizeFactor,
            );
        }

        return { useTheme };
    })();

    const { SplashScreen } = createSplashScreen({ useTheme });

    const { ThemeProvider } = (() => {
        function ThemeProviderInner(
            props: Omit<ThemeProviderProps, "getViewPortConfig">,
        ) {
            const { splashScreen, children } = props;

            const theme = useTheme();

            return (
                <themeBaseContext.Provider value={theme}>
                    <CacheProvider value={cache}>
                        <MuiThemeProvider theme={theme.muiTheme}>
                            <CssBaseline />
                            {splashScreen === undefined ? (
                                children
                            ) : (
                                <SplashScreen {...splashScreen}>
                                    {children}
                                </SplashScreen>
                            )}
                        </MuiThemeProvider>
                    </CacheProvider>
                </themeBaseContext.Provider>
            );
        }

        function ThemeProvider(props: ThemeProviderProps) {
            const { splashScreen, getViewPortConfig } = props;

            const getConfig = useCallback<ViewPortAdapterProps["getConfig"]>(
                params => {
                    assert(getViewPortConfig !== undefined);

                    let config: ReturnType<typeof getViewPortConfig>;

                    try {
                        config = getViewPortConfig(params);
                    } catch (error) {
                        if (!(error instanceof ViewPortOutOfRangeError)) {
                            throw error;
                        }

                        const { fallbackNode } = error;

                        throw new ViewPortOutOfRangeError(
                            (
                                <ThemeProviderInner>
                                    {fallbackNode}
                                </ThemeProviderInner>
                            ),
                        );
                    }

                    return config;
                },
                [getViewPortConfig],
            );

            const children = (
                <ThemeProviderInner splashScreen={splashScreen}>
                    {props.children}
                </ThemeProviderInner>
            );

            return getViewPortConfig === undefined ? (
                <div style={{ "height": "100vh" }}>{children}</div>
            ) : (
                <ViewPortAdapter getConfig={getConfig}>
                    {children}
                </ViewPortAdapter>
            );
        }

        return { ThemeProvider };
    })();

    return { ThemeProvider, useTheme };
}
