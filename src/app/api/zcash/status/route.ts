import { NextResponse } from "next/server";
import { getNotaryStatus } from "@/services/zcash/status";
import { getZcashConfig, isNotaryConfigured } from "@/services/zcash/config";

export async function GET() {
  const config = getZcashConfig();
  const wallet = await getNotaryStatus();

  return NextResponse.json(
    {
      status: "success",
      config: {
        network: config.network,
        notaryAddress: config.notaryAddress,
        isConfigured: isNotaryConfigured(),
        lightwalletdUrl: config.lightwalletdUrl,
        faucets: config.faucets,
      },
      wallet,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
