import type { PropsWithChildren, ReactElement } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset
} from "react-native-reanimated";

import { atomPalette, atomSpacing } from "@/components/atoms/theme";
import { useBottomTabOverflow } from "@/components/ui/TabBarBackground";

const HEADER_HEIGHT = 250;

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: string;
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor
}: Props) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);
  const bottom = useBottomTabOverflow();
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75]
          )
        },
        {
          scale: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [2, 1, 1]
          )
        }
      ]
    };
  });

  return (
    <Animated.View style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef}
        scrollEventThrottle={16}
        scrollIndicatorInsets={{ bottom }}
        contentContainerStyle={{ paddingBottom: bottom }}
      >
        <Animated.View
          style={[
            styles.header,
            { backgroundColor: headerBackgroundColor },
            headerAnimatedStyle
          ]}
        >
          {headerImage}
        </Animated.View>
        <Animated.View style={styles.content}>{children}</Animated.View>
      </Animated.ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: atomPalette.background,
    flex: 1
  },
  header: {
    height: HEADER_HEIGHT,
    overflow: "hidden"
  },
  content: {
    flex: 1,
    padding: atomSpacing[8],
    gap: atomSpacing[4],
    overflow: "hidden"
  }
});
