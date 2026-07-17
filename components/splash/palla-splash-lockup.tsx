import { getMonoFontStyle, getSansFontStyle } from "@/theme/fonts";
import { Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedStyle
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

export const pallaSplashColors = {
  court: "#062C22",
  cream: "#FFFDF7",
  lime: "#D5ED42"
} as const;

const iconWidth = 158;
const iconHeight = 172;
const viewBox = { height: 235, width: 210, x: 20, y: 5 };

const dotDefinitions = [
  { cx: 98, cy: 62, dx: -220, dy: -300 },
  { cx: 124, cy: 62, dx: 60, dy: -360 },
  { cx: 150, cy: 62, dx: 290, dy: -240 },
  { cx: 85, cy: 88, dx: -330, dy: -40 },
  { cx: 111, cy: 88, dx: -140, dy: 340 },
  { cx: 137, cy: 88, dx: 180, dy: 380 },
  { cx: 163, cy: 88, dx: 340, dy: 80 },
  { cx: 98, cy: 114, dx: -260, dy: 200 },
  { cx: 124, cy: 114, dx: 40, dy: 420 },
  { cx: 150, cy: 114, dx: 260, dy: -120 }
] as const;

function toIconX(value: number) {
  return ((value - viewBox.x) / viewBox.width) * iconWidth;
}

function toIconY(value: number) {
  return ((value - viewBox.y) / viewBox.height) * iconHeight;
}

function SplashDot({
  definition,
  progress
}: {
  definition: (typeof dotDefinitions)[number];
  progress: SharedValue<number>;
}) {
  const dotSize = 14;
  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0.32, 0.44],
      [pallaSplashColors.cream, pallaSplashColors.court]
    ),
    opacity: interpolate(
      progress.value,
      [0, 0.06],
      [0, 1],
      Extrapolation.CLAMP
    ),
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 0.32],
          [(definition.dx / viewBox.width) * iconWidth, 0],
          Extrapolation.CLAMP
        )
      },
      {
        translateY: interpolate(
          progress.value,
          [0, 0.32],
          [(definition.dy / viewBox.height) * iconHeight, 0],
          Extrapolation.CLAMP
        )
      }
    ]
  }));

  return (
    <Animated.View
      style={[
        {
          borderRadius: dotSize / 2,
          height: dotSize,
          left: toIconX(definition.cx) - dotSize / 2,
          position: "absolute",
          top: toIconY(definition.cy) - dotSize / 2,
          width: dotSize
        },
        style
      ]}
    />
  );
}

function SplashPaddle({ progress }: { progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.32, 0.44],
      [0, 0, 1],
      Extrapolation.CLAMP
    )
  }));

  return (
    <Animated.View style={[{ position: "absolute" }, style]}>
      <Svg height={iconHeight} viewBox="20 5 210 235" width={iconWidth}>
        <Path
          d="M62 226C45 219 35 204 35 184V82C35 43 66 18 106 18h29c45 0 78 28 78 70s-33 70-78 70h-31c-25 0-42 16-42 41v27Z"
          fill={pallaSplashColors.cream}
        />
      </Svg>
    </Animated.View>
  );
}

function SplashBall({ progress }: { progress: SharedValue<number> }) {
  const ballSize = 35;
  const style = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 0.09, 0.18, 0.27, 0.34, 0.4],
          [-256, -188, -113, -53, -15, 0],
          Extrapolation.CLAMP
        )
      },
      {
        translateY: interpolate(
          progress.value,
          [0, 0.09, 0.18, 0.27, 0.34, 0.4],
          [-308, 0, -110, 0, -44, 0],
          Extrapolation.CLAMP
        )
      },
      {
        scaleX: interpolate(
          progress.value,
          [0, 0.39, 0.4, 0.43],
          [1, 1, 1.18, 1],
          Extrapolation.CLAMP
        )
      },
      {
        scaleY: interpolate(
          progress.value,
          [0, 0.39, 0.4, 0.43],
          [1, 1, 0.8, 1],
          Extrapolation.CLAMP
        )
      }
    ]
  }));

  return (
    <Animated.View
      style={[
        {
          backgroundColor: pallaSplashColors.lime,
          borderRadius: ballSize / 2,
          height: ballSize,
          left: toIconX(91) - ballSize / 2,
          position: "absolute",
          top: toIconY(202) - ballSize / 2,
          width: ballSize
        },
        style
      ]}
    />
  );
}

export function PallaSplashLockup({
  progress
}: {
  progress: SharedValue<number>;
}) {
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.56, 0.68],
      [0, 1],
      Extrapolation.CLAMP
    ),
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0.56, 0.68],
          [-44, 0],
          Extrapolation.CLAMP
        )
      }
    ]
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.66, 0.78],
      [0, 1],
      Extrapolation.CLAMP
    ),
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0.66, 0.78],
          [-32, 0],
          Extrapolation.CLAMP
        )
      }
    ]
  }));

  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          height: iconHeight,
          overflow: "visible",
          position: "relative",
          width: iconWidth
        }}
      >
        <SplashPaddle progress={progress} />
        {dotDefinitions.map((definition) => (
          <SplashDot
            definition={definition}
            key={`${definition.cx}-${definition.cy}`}
            progress={progress}
          />
        ))}
        <SplashBall progress={progress} />
      </View>

      <Animated.View style={[{ paddingTop: 18 }, wordmarkStyle]}>
        <Text
          style={{
            color: pallaSplashColors.cream,
            fontSize: 58,
            letterSpacing: -2.9,
            lineHeight: 64,
            ...getSansFontStyle("500")
          }}
        >
          palla
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          {
            flexDirection: "row",
            gap: 10,
            paddingTop: 14
          },
          taglineStyle
        ]}
      >
        <Text
          style={{
            color: pallaSplashColors.cream,
            fontSize: 12,
            letterSpacing: 4,
            lineHeight: 16,
            ...getMonoFontStyle("600")
          }}
        >
          PLAY MORE.
        </Text>
        <Text
          style={{
            color: pallaSplashColors.lime,
            fontSize: 12,
            letterSpacing: 4,
            lineHeight: 16,
            ...getMonoFontStyle("600")
          }}
        >
          MEET MORE.
        </Text>
      </Animated.View>
    </View>
  );
}
