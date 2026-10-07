import * as React from "npm:react@19.1.0";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
  render
} from "npm:react-email@6.6.6";

type WelcomeToPallaEmailProps = {
  appUrl: string;
  name: string;
};

const body = {
  backgroundColor: "#fbf8ff",
  color: "#1a1b22",
  fontFamily:
    "'Hanken Grotesk', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  margin: "0",
  padding: "0"
};

const page = {
  margin: "0 auto",
  maxWidth: "560px",
  padding: "40px 20px"
};

const wordmark = {
  color: "#1a1b22",
  fontSize: "18px",
  fontWeight: "800",
  letterSpacing: "-0.02em",
  margin: "0 0 20px",
  textTransform: "uppercase" as const
};

const card = {
  backgroundColor: "#ffffff",
  border: "1px solid #e3e1ec",
  borderRadius: "24px",
  padding: "32px"
};

const eyebrow = {
  color: "#536600",
  fontFamily: "Geist, Inter, -apple-system, BlinkMacSystemFont, sans-serif",
  fontSize: "12px",
  letterSpacing: "0.08em",
  margin: "0 0 12px",
  textTransform: "uppercase" as const
};

const heading = {
  color: "#1a1b22",
  fontSize: "28px",
  fontWeight: "800",
  lineHeight: "1.18",
  margin: "0 0 16px"
};

const paragraph = {
  color: "#43444c",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 18px"
};

const ctaWrap = {
  margin: "28px 0 0",
  textAlign: "center" as const
};

const cta = {
  backgroundColor: "#1a1b22",
  borderRadius: "16px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: "700",
  padding: "14px 18px",
  textDecoration: "none"
};

const divider = {
  borderColor: "#e3e1ec",
  margin: "28px 0 20px"
};

const fallbackLabel = {
  color: "#757a60",
  fontSize: "13px",
  lineHeight: "1.5",
  margin: "0 0 8px"
};

const fallbackUrl = {
  color: "#43444c",
  fontSize: "12px",
  lineHeight: "1.5",
  margin: "0",
  wordBreak: "break-all" as const
};

const footer = {
  color: "#757a60",
  fontSize: "12px",
  lineHeight: "1.5",
  margin: "20px 0 0",
  textAlign: "center" as const
};

export function WelcomeToPallaEmail({
  appUrl,
  name
}: WelcomeToPallaEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Welcome to Palla. Your account is ready.</Preview>
      <Body style={body}>
        <Container style={page}>
          <Text style={wordmark}>Palla</Text>

          <Section style={card}>
            <Text style={eyebrow}>Welcome</Text>

            <Heading as="h1" style={heading}>
              Welcome to Palla, {name}
            </Heading>

            <Text style={paragraph}>
              Your account is ready. Palla helps you discover and join recurring
              social padel sessions.
            </Text>

            <Text style={{ ...paragraph, marginBottom: "24px" }}>
              Open Palla to find your next session and manage your account.
            </Text>

            <Section style={ctaWrap}>
              <Link href={appUrl} style={cta}>
                Open Palla
              </Link>
            </Section>

            <Hr style={divider} />

            <Text style={fallbackLabel}>
              If the button does not work, copy and paste this link into your
              browser:
            </Text>
            <Text style={fallbackUrl}>{appUrl}</Text>
          </Section>

          <Text style={footer}>
            You are receiving this because a welcome email was requested for
            your Palla account.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function renderWelcomeToPallaEmail(input: WelcomeToPallaEmailProps) {
  return render(<WelcomeToPallaEmail {...input} />);
}
