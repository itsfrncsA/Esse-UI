window.addEventListener('message', function(event) {
    let item = event.data;

    if (item.type === "ui") {
        if (item.status === true) {
            document.body.style.display = "block";
        } else {
            document.body.style.display = "none";
        }
    }
});

document.getElementById('close-btn').addEventListener('click', function() {
    fetch(`https://${GetParentResourceName()}/closeNUI`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8'
        },
        body: JSON.stringify({})
    }).then(resp => resp.json()).then(resp => console.log(resp));
});
