document.getElementById('searchBar').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {  // Trigger search on Enter key
        const query = event.target.value.toLowerCase();
        const tracks = document.querySelectorAll('#recentlyPlayedList li');

        let found = false;
        tracks.forEach(track => {
            const trackName = track.querySelector('strong').textContent.toLowerCase();
            if (trackName.includes(query)) {
                track.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Add the highlight class to trigger the fade effect
                track.classList.add('highlight');
                
                // Remove the highlight class after 2 seconds (duration of animation)
                setTimeout(() => track.classList.remove('highlight'), 2000);  

                found = true;
            }
        });

        if (!found) {
            alert('Song not found!');
        }
    }
});
