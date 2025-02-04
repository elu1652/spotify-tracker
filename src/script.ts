import { processRecentlyPlayed } from "./dataProcessing";

const redirectUri = import.meta.env.VITE_REDIRECT_URI;

const clientId = "0edea9b6dcf14cdea1bc65384867fd6d"; //client id
const params = new URLSearchParams(window.location.search);
const code = params.get("code");
let storedToken = localStorage.getItem("accessToken");
console.log(storedToken);

const refreshInterval = 60; // 5 minutes in seconds
let timeLeft = refreshInterval;

if(storedToken !== undefined && storedToken !== null) {
    console.log("token exists");
    const accessToken = storedToken;
 
    checkTokenValidity(accessToken);

} else if (!code) {
    redirectToAuthCodeFlow(clientId);
} else {
    (async () => {
        const accessToken = await getAccessToken(clientId, code);
        checkTokenValidity(accessToken);
      })();
    //const accessToken = await getAccessToken(clientId, code);
    //checkTokenValidity(accessToken);
}

setInterval(() => {
    if (timeLeft > 0) {
        timeLeft--;
    } else {
        // Trigger refresh when countdown reaches 0
        const currentToken = localStorage.getItem("accessToken");
        if (currentToken) {
            reloadData(currentToken);
        }
        timeLeft = refreshInterval; // Reset countdown after refresh
    }
    updateCountdownDisplay();
}, 1000); // Update every second


export async function redirectToAuthCodeFlow(clientId: string) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", redirectUri);
    params.append("scope", "user-read-private user-read-email user-read-recently-played");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length: number) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier: string) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export async function getAccessToken(clientId: string, code: string): Promise<string> {
    const verifier = localStorage.getItem("verifier");

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", redirectUri);
    params.append("code_verifier", verifier!);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();

    localStorage.setItem("accessToken", access_token);
    storedToken = access_token;

    return access_token;
}

async function checkTokenValidity(token: string) {
    try {
        const profile = await fetchProfile(token);
        const recentlyPlayed = await fetchRecentlyPlayed(token);
        const processedRecentlyPlayed = await processRecentlyPlayed(recentlyPlayed.items, profile.id) || [];

        populateUI(profile);
        displayRecentlyPlayed(processedRecentlyPlayed);
    } catch (error) {
        console.error("Token is invalid or expired", error);
        showReloginButton();
    }
}

async function reloadData(token: string){
    try {
        const profile = await fetchProfile(token);
        const recentlyPlayed = await fetchRecentlyPlayed(token);
        const processedRecentlyPlayed = await processRecentlyPlayed(recentlyPlayed.items, profile.id) || [];
        displayRecentlyPlayed(processedRecentlyPlayed);
    } catch (error) {
        console.error("Token is invalid or expired", error);
        redirectToAuthCodeFlow(clientId);
    }
}

function showReloginButton() {
    // Show the re-login button
    document.getElementById('reloginButton')!.style.display = 'inline-block';
}

document.getElementById('reloginButton')!.addEventListener('click', async function () {
    // Redirect to Spotify login page to get a new token
    console.log("click");
    localStorage.removeItem("accessToken");
    redirectToAuthCodeFlow(clientId);
});

async function fetchProfile(token: string): Promise<UserProfile> {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    if (result.status === 401) {
        // Token is invalid or expired
        console.warn("Access token is invalid or expired. Refreshing token...");
        localStorage.removeItem("accessToken"); 
        await redirectToAuthCodeFlow(clientId); // Call your refresh function
        //return fetchProfile(token); // Call the function again
      }
  
      if (!result.ok) {
        throw new Error(`Spotify API error: ${result.status}`);
      }

    return await result.json();
}

export async function fetchRecentlyPlayed(token: string) {
    const result = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=50", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    const data = await result.json();


    //const processedRecentlyPlayed = processRecentlyPlayed(data.items) || [];

    return data;
}

function populateUI(profile: UserProfile) {
    document.getElementById("displayName")!.innerText = profile.display_name;
    if (profile.images[0]) {
        const profileImage = new Image(200, 200);
        profileImage.src = profile.images[0].url;
        document.getElementById("avatar")!.appendChild(profileImage);
    }
    document.getElementById("id")!.innerText = profile.id;
    document.getElementById("email")!.innerText = profile.email;
    document.getElementById("uri")!.innerText = profile.uri;
    document.getElementById("uri")!.setAttribute("href", profile.external_urls.spotify);
    document.getElementById("url")!.innerText = profile.href;
    document.getElementById("url")!.setAttribute("href", profile.href);
    document.getElementById("imgUrl")!.innerText = profile.images[0]?.url ?? '(no profile image)';
}

export function displayRecentlyPlayed(tracks: ProcessedTrack[]) {
    const listContainer = document.getElementById("recentlyPlayedList")!;
    listContainer.innerHTML = ""; // Clear existing items

    // Iterate over the processed tracks
    tracks.forEach(track => {
        // Ensure that track data is valid
        if (track) {
            const listItem = document.createElement("li");
            //console.log(track); 
            // Extract track details
            const trackName = track.name;
            const artistNames = track.artists;
            //const albumName = track.track.album.name;
            const albumCover = track.albumCover; // Taking the highest resolution image
            const playCount = track.count;
            const lastListened = new Date(track.lastListened);

            const timeAgo = getTimeAgo(lastListened);

            // Create the HTML content for the track
            //<img src="${albumCover}" alt="${albumName} cover" style="width: 50px; height: 50px; margin-right: 10px;">
            //Album: ${albumName} <br>
            /*
            listItem.innerHTML = `
                <img src="${albumCover}"  cover" style="width: 50px; height: 50px; margin-right: 10px;">
                <strong>${trackName}</strong> by ${artistNames} <br>
                
                Played ${playedCount} times, Last listened: ${timeAgo}
            `;
            */
            listItem.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <img src="${albumCover}" alt="${trackName} cover">
                    <div style="margin-left: 15px;">
                        <strong>${trackName}</strong>
                        <div class="artist">${artistNames}</div>
                        <div class="play-count">Play Count: ${playCount}</div>
                    </div>
                </div>
                <div class="time-info">Last listened: ${timeAgo}</div>
            `;

            // Append the track item to the list
            listContainer.appendChild(listItem);
        } else {
            console.warn('Invalid track data:', track); // Log invalid track data for debugging
        }
    });
}

function getTimeAgo(lastListened: Date): string {
    const now = new Date();
    const diff = now.getTime() - lastListened.getTime(); // Difference in milliseconds

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
        return `${seconds} seconds ago`;
    } else if (minutes < 60) {
        return `${minutes} minutes ago`;
    } else if (hours < 24) {
        return `${hours} hours ago`;
    } else {
        return `${days} days ago`;
    }
}


function updateCountdownDisplay() {
    const timerElement = document.getElementById("refreshTimer");
    if (timerElement) {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `Next refresh in: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}
