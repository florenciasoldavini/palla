import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import { designTokens } from "@/theme/tokens";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Platform } from "react-native";

export function HapticTab(props: BottomTabBarButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isWeb = Platform.OS === "web";
  const {
    children: originalChildren,
    onHoverIn,
    onHoverOut,
    onPressIn,
    style,
    ...pressableProps
  } = props;
  const isSelected = Boolean(
    props.accessibilityState?.selected || props["aria-selected"]
  );
  const shouldTintContent = isWeb && isHovered && !isSelected;
  const children = shouldTintContent
    ? tintTabChildren(
        originalChildren,
        designTokens.colors.semantic.text.secondary
      )
    : originalChildren;

  return (
    <PlatformPressable
      {...pressableProps}
      onHoverIn={(event) => {
        setIsHovered(true);
        onHoverIn?.(event);
      }}
      onHoverOut={(event) => {
        setIsHovered(false);
        onHoverOut?.(event);
      }}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === "ios") {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPressIn?.(ev);
      }}
      style={style}
    >
      {children}
    </PlatformPressable>
  );
}

function tintTabChildren(children: React.ReactNode, color: string) {
  return React.Children.map(children, (child) => tintTabChild(child, color));
}

function tintTabChild(child: React.ReactNode, color: string): React.ReactNode {
  if (!React.isValidElement(child)) {
    return child;
  }

  const props = child.props as {
    activeTintColor?: unknown;
    children?: React.ReactNode;
    inactiveTintColor?: unknown;
    tintColor?: unknown;
  };
  const nextProps: Record<string, unknown> = {};

  if (typeof props.activeTintColor === "string") {
    nextProps.activeTintColor = color;
  }

  if (typeof props.inactiveTintColor === "string") {
    nextProps.inactiveTintColor = color;
  }

  if (typeof props.tintColor === "string") {
    nextProps.tintColor = color;
  }

  if (props.children) {
    nextProps.children = tintTabChildren(props.children, color);
  }

  return React.cloneElement(child, nextProps);
}
