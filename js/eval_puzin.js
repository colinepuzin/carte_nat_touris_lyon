/////////////////////////////////////////////////////////////////////
////////////////// CREATION DES VARIABLES DE BASE ///////////////////
/////////////////////////////////////////////////////////////////////

var map = L.map('map');
var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
var osmAttrib = 'Map data © OpenStreetMap contributors';
var osm = new L.TileLayer(osmUrl, { attribution: osmAttrib }).addTo(map);



/////////////////////////////////////////////////////////////////////
////////////////// CREATION DES STYLES DES COUCHES //////////////////
/////////////////////////////////////////////////////////////////////

//// CREATION DES FONCTIONS DE STYLE POUR LA COUCHE DES ESPACES NATURELS

// en vert clair s'il n'y a pas de zone de préemption, sinon en vert foncé
function getColor(reponse) {
    return reponse == "oui" ? '#41ae76' :
        '#99d8c9';
}

function style_ens(feature) {
    return {
        fillColor: getColor(feature.properties.zone_preemption),
        weight: 2,
        opacity: 2,
        color: 'white',
        fillOpacity: 0.8
    };
}


//// CREATION DES STYLES POUR LES SENTIERS DE RANDONNEES 

function style_rando(feature) {
    return {
        weight: 2,
        opacity: 1,
        color: 'green',
        fillOpacity: 0.7
    };
}


//// IMPORT D'UNE ICONE POUR LES POINT D'INTERET TOURISTIQUES ISOLES

var poi_icon = L.icon({
    iconUrl: 'img/poi.png',
    iconSize: [36, 36],
    iconAnchor: [18, 36]
});


//////////////////////////////////////////////////////////////////////
////////////////// CREATION DES LEGENDES  ////////////////////////////
//////////////////////////////////////////////////////////////////////


//// LEGENDE DES ESPACES NATURELS 

var legend_ens = L.control({ position: 'bottomright' });

legend_ens.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend');

    // Entrer les caractéristiques de la légende et rattacher à la fonction getColor créée précedemment
    div.innerHTML = '<strong>Espaces Naturels Sensibles</strong><br>';
    div.innerHTML += '<i style="background:' + getColor("oui") + '"></i> Avec zone de préemption<br>';
    div.innerHTML += '<i style="background:' + getColor("non") + '"></i> Sans zone de préemption<br>';

    return div;
};


//// LEGENDE DES SENTIERS DE RANDONNEES

var legend_rando = L.control({ position: 'bottomright' });

legend_rando.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend');

    // Entrer les caractéristiques de la légende et rattacher au style créé précedemment
    div.innerHTML = '<strong>Sentiers de randonnée</strong><br>';
    div.innerHTML +=
        '<i style="background: green; width: 18px; height: 6px; display: inline-block; margin-right: 8px;"></i> Sentier <br>';

    return div;
};



///////////////////////////////////////////////////////////////////////
/////   FONCTIONS - INFORMATION AU PASSAGE DE LA SOURIS        ////////
///////////////////////////////////////////////////////////////////////

/// CREATION D'UNE FONCTION SUR LA COUCHE DES ESPACES NATURELS QUI PERMET AU CLIC DE ZOOMER SUR LE SITE
/// ET D'AFFICHER SON NOM DANS UN RECTANGLE EN DEHORS DE LA CARTE 

function mouse_events_ens(feature, couche) {
    couche.on('click', function (e) {
        // Option zoom
        map.fitBounds(e.target.getBounds());

        // Recupère le nom du site - lien avec le HTML 
        var info_div = document.getElementById("info");
        info_div.innerHTML = "Nom de l'espace naturel sensible : " + e.target.feature.properties.site
    });
};


/// CREATION D'UNE FONCTION SUR LA COUCHE DES POI QUI PERMET AU SURVOL DE CREER UNE ZONE TAMPON
/// DE CHANGER LE LOGO ET AU CLICK D'AFFICHER UN POPUP


function mouse_events_poi(feature, couche) {
    let buffer = null;  // permet de stocker temporairement la zone tampon
    let originalIcon = null; // permet de stocker l'icône des POI 


    // au clic, popup qui apparait avec le nom
    couche.on('click', function (e) {
        couche.bindPopup('<p>Point interessant : ' + e.target.feature.properties.nom + '</p>');
    })

    // au survol
    couche.on('mouseover', function (e) {

        // Création de la zone tampon autour du POI

        let latlng = e.target.getLatLng();
        buffer = L.circle(latlng, {
            radius: 300,  // Rayon de 300m
            color: 'orange',
            weight: 2,
            fillOpacity: 0.3
        }).addTo(map);

        // Changement de l'icône du POI

        originalIcon = e.target.getIcon();  // Sauvegarde de l'icône d'origine
        e.target.setIcon(L.icon({
            iconUrl: 'img/poi_rouge.png', // Remplace par la nouvelle icone
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        }));
    });

    // Au départ de la souris
    couche.on('mouseout', function (e) {
        // Suppression de la zone tampon
        if (buffer) {
            map.removeLayer(buffer);
        }

        // Réinitialisation de l'icône
        if (originalIcon) {
            e.target.setIcon(originalIcon);
        }
    });
};


///////////////////////////////////////////////////////////////////////
////////////FONCTIONS QUI PERMETTENT DE RECUPERER LES DONNÉES /////////
///////////////////////////////////////////////////////////////////////

///// CREATION DE LA FONCTION QUI RECUPERE LES DONNÉES ESPACES NATURELS SENSIBLES, LEUR APPLIQUE UN STYLE 
//// ET LES FONCTIONNALITÉS AU CLIC



async function charger_geojson_ens(url) {
    let response = await fetch(url);
    let notre_geojson = await response.json();
    return L.geoJSON(notre_geojson, { style: style_ens, onEachFeature: mouse_events_ens });
}


//// CREATION DE LA FONCTION QUI RECUPERE LES DONNÉES RANDONNÉES  ET LEUR APPLIQUE UN STYLE

async function charger_geojson_rando(url) {
    let response = await fetch(url);
    let notre_geojson = await response.json();
    return L.geoJSON(notre_geojson, { style: style_rando });
}


//// CREATION DE LA FONCTION QUI RECUPERE LES DONNÉES DES POINTS D'INTERET TOURISTIQUES, LEUR APPLIQUE UNE ICONE
//// ET LES FONCTIONNALITÉS AU CLIC ET SURVOL 


async function charger_geojson_poi(url) {
    let response = await fetch(url);
    let notre_geojson = await response.json();
    return L.geoJSON(notre_geojson, {
        onEachFeature: mouse_events_poi,
        pointToLayer: function (feature, latlng) {
            return L.marker(latlng, { icon: poi_icon });
        },
    });
}


///////////////////////////////////////////////////////////////////////
///////// FONCTION- AFFICHAGE DES DONNEES ET STYLE SUR LA CARTE  //////
///////////////////////////////////////////////////////////////////////

async function ajouterGeoJson() {


    // Chargement des GeoJSON
    let ens = await charger_geojson_ens('data/ens_metro.json');
    let rando = await charger_geojson_rando('data/rando_metro.json');
    let poi = await charger_geojson_poi('data/poi_metro.json')


    // Recentrer la carte sur les POI, ils ont la plus grande emprise
    map.fitBounds(poi.getBounds())


    // Créer un groupe de clusters pour les points d'intérêt (POI)
    var marqueurs_poi = L.markerClusterGroup();
    marqueurs_poi.addLayer(poi);  


    // Création du gestionnaire de couches
    var baseLayers = {
        "OpenStreetMap": osm
    };

    var overlays = {
        "Espaces Naturels Sensibles": ens,
        "Sentiers de randonnée": rando,
        "Points d'interet": marqueurs_poi
    };

    // Ajouter le gestionnaire de couches à la carte
    L.control.layers(baseLayers, overlays).addTo(map);

    // Ajouter les GeoJSON à la carte
    ens.addTo(map);
    rando.addTo(map);
    map.addLayer(marqueurs_poi);

    // Ajout de la légende
    legend_ens.addTo(map)
    legend_rando.addTo(map)

    // Gestion dynamique de la légende 

        // ajouter la légende (layeradd), si elle est cochée
    map.on('layeradd', function (e) {
        if (e.layer === ens) {
            legend_ens.addTo(map); // si la couche ENS est cochée
        }
        if (e.layer === rando) {
            legend_rando.addTo(map); // si la couche rando est cochée
        }
    });

        // enlever la légende (layerremove), si elle est décochée
    map.on('layerremove', function (e) {
        if (e.layer === ens) {
            legend_ens.remove(); // si la couche ENS est décochée
        }
        if (e.layer === rando) {
            legend_rando.remove(); // si la couche rando est décochée
        }
    });

}


///////////////////////////////////////////////////////////////////////
/////////EXECUTION - AFFICHAGE DES DONNEES ET STYLE SUR LA CARTE  /////
///////////////////////////////////////////////////////////////////////

ajouterGeoJson(); 



///////////////////////////////////////////////////////////////////////
///////////////////////// AJOUT D'UNE ECHELLE /////////////////////////
///////////////////////////////////////////////////////////////////////

L.control.scale().addTo(map);
