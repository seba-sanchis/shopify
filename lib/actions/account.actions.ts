"use server";

import { cookies } from "next/headers";
import { newBag } from "./bag.actions";
import { Privacy } from "@/types";

const { SHOPIFY_ACCESS_TOKEN, SHOPIFY_STORE_URL } = process.env;

// Login
export async function signIn(account: Privacy) {
  const { email, password } = account;

  try {
    const response = await fetch(
      `${SHOPIFY_STORE_URL}/api/2023-07/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": SHOPIFY_ACCESS_TOKEN!,
        },
        body: JSON.stringify({
          query: `
          mutation signIn {
            customerAccessTokenCreate(input: {
              email: "${email}",
              password: "${password}"
            }) {
              customerAccessToken {
                accessToken
                expiresAt
              }
              userErrors {
                field
                message
              }
            }
          }`,
        }),
      }
    );

    const data = await response.json();

    if (data.data.customerAccessTokenCreate.userErrors[0]) {
      throw new Error(
        `${data.data.customerAccessTokenCreate.userErrors[0].message}`
      );
    }

    const accessToken =
      data.data.customerAccessTokenCreate.customerAccessToken.accessToken;

    cookies().set("accessToken", accessToken);
    const bagId = cookies().get("bagId");

    if (!bagId) {
      await newBag();
    }

    return data.data.customerAccessTokenCreate.customerAccessToken.accessToken;
  } catch (error: any) {
    throw new Error(`Failed to sign in: ${error.message}`);
  }
}

// Logout
export async function signOut() {
  try {
    cookies().delete("accessToken");

    return;
  } catch (error: any) {
    throw new Error(`Failed to fetch customer: ${error.message}`);
  }
}

// Reset Password
export async function resetPassword(email: string) {
  try {
    const response = await fetch(
      `${SHOPIFY_STORE_URL}/api/2023-07/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": SHOPIFY_ACCESS_TOKEN!,
        },
        body: JSON.stringify({
          query: `
            mutation resetCustomerPassword {
              customerRecover(email: "${email}") {
                userErrors {
                  field
                  message
                }
              }
            }
          `,
        }),
      }
    );

    const data = await response.json();

    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    return data.data.customerRecover.userErrors;
  } catch (error: any) {
    throw new Error(`Failed to reset account password: ${error.message}`);
  }
}
