"use client";
import React, { useEffect, useLayoutEffect } from "react";
import { config } from "./config";
import { OverlayProvider } from "@gluestack-ui/overlay";
import { ToastProvider } from "@gluestack-ui/toast";
import { setFlushStyles } from "@gluestack-ui/nativewind-utils/flush";
import { script } from "./script";

export type ModeType = "light";

const variableStyleTagId = "nativewind-style";
const createStyle = (styleTagId: string) => {
  const style = document.createElement("style");
  style.id = styleTagId;
  style.appendChild(document.createTextNode(""));
  return style;
};

export const useSafeLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function GluestackUIProvider({
  mode = "light",
  ...props
}: {
  mode?: ModeType;
  children?: React.ReactNode;
}) {
  let cssVariablesWithMode = ``;
  Object.keys(config).forEach((configKey) => {
    cssVariablesWithMode +=
      configKey === "dark" ? `\n .dark {\n ` : `\n:root {\n`;
    const cssVariables = Object.keys(
      config[configKey as keyof typeof config]
    ).reduce((acc: string, curr: string) => {
      acc += `${curr}:${config[configKey as keyof typeof config][curr]}; `;
      return acc;
    }, "");
    cssVariablesWithMode += `${cssVariables} \n}`;
  });

  setFlushStyles(cssVariablesWithMode);

  useSafeLayoutEffect(() => {
    script(mode);
  }, [mode]);

  useSafeLayoutEffect(() => {
    if (typeof window !== "undefined") {
      const documentElement = document.documentElement;
      if (documentElement) {
        const head = documentElement.querySelector("head");
        let style = head?.querySelector(`[id='${variableStyleTagId}']`);
        if (!style) {
          style = createStyle(variableStyleTagId);
          style.innerHTML = cssVariablesWithMode;
          if (head) head.appendChild(style);
        }
      }
    }
  }, []);

  return (
    <>
      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `(${script.toString()})('${mode}')`
        }}
      />
      <OverlayProvider>
        <ToastProvider>{props.children}</ToastProvider>
      </OverlayProvider>
    </>
  );
}
