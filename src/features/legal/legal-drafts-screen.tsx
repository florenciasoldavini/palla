import { useEffect, useState } from "react";
import { BackHandler, ScrollView, StyleSheet, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ChevronRight } from "lucide-react-native";
import {
  AppButton,
  AppHeading,
  AppText,
  Screen,
  SkeletonBlock,
  ErrorState
} from "@/components/atoms";
import { useAppLanguage } from "@/infrastructure/localization/language-provider";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
import drafts from "./drafts.json";

type Document = "terms" | "privacy";
const copy = {
  es: {
    title: "Información legal",
    draft: "Borradores · Sin vigencia",
    notice:
      "Estos documentos están en revisión. No se solicita tu aceptación y no se modifica tu cuenta.",
    terms: "Términos de uso",
    privacy: "Política de Privacidad",
    pending: "Por completar",
    details:
      "Domicilio de contacto, conservación y eliminación de datos, y verificación de proveedores de producción.",
    back: "Volver",
    end: "Fin del borrador",
    review: "Volver a los documentos"
  },
  en: {
    title: "Legal information",
    draft: "Drafts · Not effective",
    notice:
      "These documents are under review. No acceptance is requested and your account is not changed.",
    terms: "Terms of Use",
    privacy: "Privacy Policy",
    pending: "Still to complete",
    details:
      "Contact address, data retention and deletion, and verification of production providers.",
    back: "Back",
    end: "End of draft",
    review: "Back to documents"
  }
};

// The four bundled Markdown files are generated from docs/legal. No network,
// account writes, acceptance tracking or production policy publication occurs.
export default function LegalDraftsScreen() {
  const { language, ready, loadError, retry } = useAppLanguage();
  const [document, setDocument] = useState<Document | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const text = copy[language];

  useEffect(() => {
    if (!document) return;
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      setDocument(null);
      return true;
    });
    return () => listener.remove();
  }, [document]);

  if (!__DEV__) return <Redirect href="/sign-in" />;
  if (!ready)
    return (
      <Screen>
        <SkeletonBlock height={240} />
      </Screen>
    );
  if (loadError)
    return (
      <Screen>
        <ErrorState
          title={
            language === "es"
              ? "No se pudo cargar el idioma"
              : "Couldn’t load language"
          }
          onRetry={retry}
        />
      </Screen>
    );
  const back = () => {
    if (document) setDocument(null);
    else if (router.canGoBack()) router.back();
    else router.replace("/sign-in");
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headingRow}>
          <AppButton
            variant="ghost"
            layout="icon"
            fullWidth={false}
            icon={ArrowLeft}
            accessibilityLabel={document ? text.review : text.back}
            onPress={back}
          />
          <AppHeading variant="section" style={styles.title}>
            {text.title}
          </AppHeading>
        </View>
      </View>
      <ScrollView
        key={`${language}:${document ?? "index"}`}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + sp[8] }
        ]}
        showsVerticalScrollIndicator
      >
        <View style={styles.notice}>
          <AppText variant="label">{text.draft}</AppText>
          {!document && <AppText variant="bodySm">{text.notice}</AppText>}
        </View>
        {document ? (
          <View style={styles.document}>
            {drafts[language][document]
              .trim()
              .split(/\n\s*\n/)
              .map((block, index) => {
                const clean = block.replace(/\*\*/g, "");
                if (clean.startsWith("# "))
                  return (
                    <AppHeading key={index} variant="title">
                      {clean.slice(2)}
                    </AppHeading>
                  );
                if (clean.startsWith("## "))
                  return (
                    <AppHeading
                      key={index}
                      variant="section"
                      style={styles.section}
                    >
                      {clean.slice(3)}
                    </AppHeading>
                  );
                return (
                  <AppText
                    key={index}
                    selectable
                    style={
                      clean.startsWith("> ") ? styles.draftText : undefined
                    }
                  >
                    {clean.replace(/^> /, "").replace(/^- /gm, "• ")}
                  </AppText>
                );
              })}
            <AppText variant="caption" tone="subtle">
              {text.end}
            </AppText>
            <AppButton variant="bordered" onPress={() => setDocument(null)}>
              {text.review}
            </AppButton>
          </View>
        ) : (
          <View style={styles.document}>
            <AppHeading variant="title">{text.title}</AppHeading>
            <View style={styles.choices}>
              {(["terms", "privacy"] as const).map((key) => (
                <AppButton
                  key={key}
                  variant="bordered"
                  icon={ChevronRight}
                  onPress={() => setDocument(key)}
                >
                  {text[key]}
                </AppButton>
              ))}
            </View>
            <View style={styles.pending}>
              <AppHeading variant="card">{text.pending}</AppHeading>
              <AppText tone="muted">{text.details}</AppText>
            </View>
            <AppText selectable>support.palla@gmail.com</AppText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  header: {
    paddingHorizontal: sp[5],
    paddingBottom: sp[4],
    gap: sp[3],
    width: "100%",
    maxWidth: 640,
    alignSelf: "center"
  },
  headingRow: { flexDirection: "row", alignItems: "center", gap: sp[2] },
  title: { flex: 1 },
  content: {
    paddingHorizontal: sp[6],
    paddingTop: sp[2],
    gap: sp[6],
    width: "100%",
    maxWidth: 640,
    alignSelf: "center"
  },
  notice: {
    padding: sp[4],
    gap: sp[2],
    backgroundColor: c.warningSurface,
    borderRadius: 12
  },
  document: { gap: sp[4] },
  section: { marginTop: sp[4] },
  draftText: { color: c.warningText },
  choices: { gap: sp[3] },
  pending: { gap: sp[2], marginTop: sp[4] }
});
