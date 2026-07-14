export default async function handler(req, res) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

  const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

  try {
    // 1. Pega a chave de acesso nova
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
      }),
    });

    const { access_token } = await tokenRes.json();

    // 2. Tenta pegar a música que tá tocando AGORA
    const songRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    let currentlyPlaying = { isPlaying: false, title: "Nenhuma música", artist: "O silêncio também é música" };

    if (songRes.status === 200) {
      const song = await songRes.json();
      if (song.item) {
        currentlyPlaying = {
          isPlaying: true,
          title: song.item.name,
          artist: song.item.artists.map((_artist) => _artist.name).join(', '),
          albumImageUrl: song.item.album.images[0]?.url,
          songUrl: song.item.external_urls.spotify,
        };
      }
    }

    // 3. Puxa as últimas 4 músicas que você ouviu
    let recentlyPlayed = [];
    const recentRes = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=4', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (recentRes.status === 200) {
      const recentData = await recentRes.json();
      recentlyPlayed = recentData.items.map(item => ({
        title: item.track.name,
        artist: item.track.artists.map(_artist => _artist.name).join(', '),
        albumImageUrl: item.track.album.images[0]?.url,
        songUrl: item.track.external_urls.spotify,
      }));
    }

    // 4. Manda tudo pro visual
    return res.status(200).json({
      currentlyPlaying,
      recentlyPlayed
    });

  } catch (error) {
    return res.status(500).json({ error: 'Deu ruim ao buscar no Spotify' });
  }
}
