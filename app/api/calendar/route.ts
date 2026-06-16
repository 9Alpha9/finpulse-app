import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
      next: { revalidate: 60 }
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
