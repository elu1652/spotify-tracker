import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';


export async function processRecentlyPlayed(recentlyPlayedData: { items: PlayedItem[] },userId: string) {
    //console.log('recentlyPlayedData:', recentlyPlayedData);

    if (!recentlyPlayedData || !Array.isArray(recentlyPlayedData)) {
        console.error("Invalid or empty recently played data:", recentlyPlayedData);
        return;
    }

    const existingTracks = await readTracksFromDatabase(userId);

    const trackMap = new Map<string, ProcessedTrack>();
 
    //console.log("existing",existingTracks);

    existingTracks.forEach((track: ProcessedTrack) => {
        trackMap.set(track.name, {
            name: track.name, 
            count: track.count,
            lastListened: track.lastListened, 
            artists: track.artists, 
            albumCover: track.albumCover 
        });
    });

    //console.log("track map",trackMap);
    //console.log("recently played data",recentlyPlayedData);

    recentlyPlayedData.reverse().forEach((item: PlayedItem) => {
        const { track, played_at } = item;
        
        if (track && track.name && played_at) {
            
            const title = track.name;
            //console.log(title);
            const listenedAt = played_at;
            const artist = track.artists ? track.artists.map(artist => artist.name).join(", ") : "";
            const albumCover = track.album.images?.[0]?.url || '';  // Default to empty string if no cover
            // Ensure we are processing the correct track data
            if (trackMap.has(title)) {
                const trackInfo = trackMap.get(title)!;

                //const listenedAtTimestamp = Timestamp.fromDate(new Date(listenedAt));
                const listenedAtTimestamp = new Date(listenedAt);
                //console.log("track",trackInfo);
                //console.log("track last listen",trackInfo.lastListened);
                //const lastListenedTimestamp = Timestamp.fromDate(new Date(trackInfo.lastListened));
                const lastListenedTimestamp = new Date(trackInfo.lastListened);
                //console.log("listened at",listenedAtTimestamp);
                //console.log("last listened",lastListenedTimestamp); 
                if (listenedAtTimestamp > lastListenedTimestamp) {
                    trackInfo.count += 1;
                    trackInfo.lastListened = listenedAt;
                }
            } else {
                trackMap.set(title, {
                    name: title,
                    count: 1,
                    lastListened: listenedAt,
                    artists: artist,
                    albumCover
                });
            }
        } else {
            // Log invalid track data for debugging
            console.warn('Invalid track data:', item);
        }
    });

    const processedTracks = Array.from(trackMap.values());

    processedTracks.sort((a, b) => b.count - a.count);

    await writeTracksToDatabase(userId, processedTracks);

    return processedTracks;
}

async function writeTracksToDatabase(userId: string, tracks: ProcessedTrack[]) {
    try {
        const userRef = doc(db, "users", userId); // Reference to the user's document

        // Write each track as a document inside the 'tracks' subcollection
        for (const track of tracks) {
            const trackRef = doc(collection(userRef, "tracks"), track.name); // Use track name as document ID
            await setDoc(trackRef, track);
        }
    } catch (error) {
        console.log("Error writing to the database:", error);
    }
}

async function readTracksFromDatabase(userId: string): Promise<ProcessedTrack[]> {
    try {
        const tracksCollection = collection(db, 'users', userId, 'tracks');
        const snapshot = await getDocs(tracksCollection);
        console.log("snapshot",snapshot.docs.map(doc => doc.data() as ProcessedTrack));
        return snapshot.docs.map(doc => doc.data() as ProcessedTrack);
    } catch (error) {
        console.error("Error reading tracks from Firestore:", error);
        return [];
    }
}



  
