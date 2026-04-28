export async function POST(request) {
  const { spaceId, token, endpoint, method, body } = await request.json();

  try {
    const res = await fetch(`https://api.contentful.com/spaces/${spaceId}${endpoint}`, {
      method: method || 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
