/**
 * LinkedIn Share API Helper
 * Handles OAuth token refresh and content publishing to LinkedIn
 */

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface LinkedInSharePayload {
  owner: string; // urn:li:person:YOUR_PERSON_ID
  text: {
    content: string;
  };
  content?: {
    media: Array<{
      status: "READY";
      media: string; // urn:li:digitalmediaAsset:ASSET_ID
    }>;
  };
  distribution: {
    feedDistribution: "MAIN_FEED" | "CONNECTIONS_FEED";
    targetEntities: [];
    thirdPartyDistributionChannels: [];
  };
}

export async function getLinkedInAccessToken(): Promise<string> {
  const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
  const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET");
  const refreshToken = Deno.env.get("LINKEDIN_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("LinkedIn OAuth credentials not configured");
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret
  });

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });

  if (!response.ok) {
    throw new Error(`LinkedIn token refresh failed: ${response.statusText}`);
  }

  const data = (await response.json()) as LinkedInTokenResponse;
  return data.access_token;
}

export async function publishToLinkedIn(
  headline: string,
  bodyText: string,
  cta: string
): Promise<{ status: string; postId?: string; error?: string }> {
  try {
    const accessToken = await getLinkedInAccessToken();
    const userUrn = Deno.env.get("LINKEDIN_USER_URN");

    if (!userUrn) {
      throw new Error("LINKEDIN_USER_URN not configured");
    }

    // Combine headline, body, and CTA for LinkedIn post
    const content = `${headline}\n\n${bodyText}\n\n${cta}`;

    const payload: LinkedInSharePayload = {
      owner: userUrn,
      text: {
        content: content
      },
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: []
      }
    };

    const response = await fetch(
      "https://api.linkedin.com/v2/ugcPosts",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": "202412"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LinkedIn API error: ${response.status} - ${error}`);
    }

    const result = await response.json() as { id: string };

    return {
      status: "published",
      postId: result.id
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[linkedin] Publication error:", message);
    return {
      status: "failed",
      error: message
    };
  }
}

export async function publishToLinkedInWithImage(
  headline: string,
  bodyText: string,
  cta: string,
  imageUrl: string
): Promise<{ status: string; postId?: string; error?: string }> {
  try {
    const accessToken = await getLinkedInAccessToken();
    const userUrn = Deno.env.get("LINKEDIN_USER_URN");

    if (!userUrn) {
      throw new Error("LINKEDIN_USER_URN not configured");
    }

    // First, register the image asset
    const registerResponse = await fetch(
      "https://api.linkedin.com/v2/assets?action=registerUpload",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": "202412"
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
            owner: userUrn,
            serviceRelationships: [
              {
                relationshipType: "OWNER",
                identifier: "urn:li:userGeneratedContent"
              }
            ]
          }
        })
      }
    );

    if (!registerResponse.ok) {
      throw new Error(`Failed to register image asset`);
    }

    const registerData = await registerResponse.json() as {
      value: {
        uploadMechanism: {
          com: {
            linkedin: {
              digitalmedia: {
                uploadhttp: {
                  uploadHttpRequest: {
                    uploadUrl: string;
                  };
                };
              };
            };
          };
        };
        asset: string;
      };
    };

    const uploadUrl = registerData.value.uploadMechanism.com.linkedin.digitalmedia.uploadhttp.uploadHttpRequest.uploadUrl;
    const assetId = registerData.value.asset;

    // Upload the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch image");
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "image/jpeg"
      },
      body: imageBuffer
    });

    if (!uploadRes.ok) {
      throw new Error(`Failed to upload image: ${uploadRes.statusText}`);
    }

    // Now publish the post with the image
    const content = `${headline}\n\n${bodyText}\n\n${cta}`;

    const payload: LinkedInSharePayload = {
      owner: userUrn,
      text: {
        content: content
      },
      content: {
        media: [
          {
            status: "READY",
            media: assetId
          }
        ]
      },
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: []
      }
    };

    const postResponse = await fetch(
      "https://api.linkedin.com/v2/ugcPosts",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": "202412"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!postResponse.ok) {
      const error = await postResponse.text();
      throw new Error(`LinkedIn API error: ${postResponse.status} - ${error}`);
    }

    const result = await postResponse.json() as { id: string };

    return {
      status: "published",
      postId: result.id
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[linkedin] Image publication error:", message);
    return {
      status: "failed",
      error: message
    };
  }
}
