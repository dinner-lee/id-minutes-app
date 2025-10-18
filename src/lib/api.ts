export async function postJSON<T>(url: string, body: any): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || `Request failed: ${url}`);
    }
    return data as T;
  }
  