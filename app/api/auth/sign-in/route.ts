import {
  getDisplayNameForEmail,
  isAllowedEmail,
  normalizeEmail,
} from "@/lib/allowed-users";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, redirect } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const normalized = normalizeEmail(email);

  if (!isAllowedEmail(normalized)) {
    return NextResponse.json(
      { error: "This email isn't on the invite list. Contact Naren for access." },
      { status: 403 }
    );
  }

  const destination =
    typeof redirect === "string" && redirect.startsWith("/")
      ? redirect
      : "/";

  const admin = createServiceClient();
  const supabase = await createClient();

  const { data: listData } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  let authUser = listData?.users?.find(
    (u) => u.email?.toLowerCase() === normalized
  );

  if (!authUser) {
    const displayName = getDisplayNameForEmail(normalized)!;
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email: normalized,
        email_confirm: true,
        user_metadata: { display_name: displayName },
      });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    authUser = created.user;
  }

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email: normalized,
    });

  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    return NextResponse.json(
      { error: linkError?.message ?? "Sign-in failed" },
      { status: 400 }
    );
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });

  if (verifyError) {
    return NextResponse.json({ error: verifyError.message }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign-in failed" }, { status: 400 });
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    const displayName = getDisplayNameForEmail(normalized)!;
    await supabase.from("profiles").insert({
      id: user.id,
      display_name: displayName,
    });
  }

  return NextResponse.json({ redirect: destination });
}
