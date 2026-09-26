// ============================================================
// FAMILY TREE
// ============================================================

let familyData = null;

// ============================================================
// LOAD FAMILY JSON
// ============================================================

document.addEventListener("DOMContentLoaded", async function () {

    try {
        const response = await fetch("./family.json", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        familyData = await response.json();

        console.log("family.json loaded successfully");
        buildFamilyTree();
        initializeSidePanel();
        initializePhotoViewer();
    } catch (error) {

        console.error("Family tree loading error:", error);
    }
});


// ============================================================
// GET MEMBER
// ============================================================

function getPerson(id) {
    return familyData.members[id] || null;

}


// ============================================================
// BUILD FAMILY TREE
// ============================================================

function buildFamilyTree() {
    const container =
        document.getElementById("familyTree");

    if (!container) {
        console.error(
            "ERROR: #familyTree was not found."
        );
        return;
    }

    // Clear old content
    container.innerHTML = "";


    // --------------------------------------------------------
    // Create family lookup table
    // --------------------------------------------------------

    const familyByMember = new Map();

    familyData.families.forEach(function (family, index) {
        family._id = index;
        const members = [
            ...(family.person || []),
            ...(family.spouse || [])
        ];

        members.forEach(function (memberID) {
            familyByMember.set(memberID, family);
        });
    });


    // --------------------------------------------------------
    // Find everybody who is someone's child
    // --------------------------------------------------------

    const childIDs = new Set();
    familyData.families.forEach(function (family) {
        (family.child || []).forEach(function (childID) {
            childIDs.add(childID);
        });
    });


    // --------------------------------------------------------
    // Find ROOT family
    //
    // A root family contains nobody who is already listed
    // as somebody else's child.
    // --------------------------------------------------------

    const rootFamilies =
        familyData.families.filter(function (family) {
            const members = [
                ...(family.person || []),
                ...(family.spouse || [])
            ];
            return members.every(function (id) {
                return !childIDs.has(id);
            });
        });

    console.log(
        "ROOT FAMILY:",
        rootFamilies
    );

    // --------------------------------------------------------
    // Root UL
    // --------------------------------------------------------

    const rootUL =
        document.createElement("ul");

    rootUL.className =
        "family-root";

    // --------------------------------------------------------
    // Prevent duplicate rendering
    // --------------------------------------------------------

    const renderedFamilies =
        new Set();

    // --------------------------------------------------------
    // Render ONLY root family/families
    // --------------------------------------------------------

    rootFamilies.forEach(function (family) {
        const node =
            createFamilyNode(
                family,
                familyByMember,
                renderedFamilies
            );

        if (node) {
            rootUL.appendChild(node);
        }
    });

    container.appendChild(rootUL);


    // --------------------------------------------------------
    // DEBUG
    // --------------------------------------------------------

    console.log(
        "Root nodes rendered:",
        rootUL.children.length
    );
}


// ============================================================
// CREATE FAMILY NODE
// ============================================================

function createFamilyNode(
    family,
    familyByMember,
    renderedFamilies
) {

    if (!family) {
        return null;
    }

    // --------------------------------------------------------
    // Prevent duplicate family
    // --------------------------------------------------------

    if (renderedFamilies.has(family._id)) {
        console.warn(
            "Duplicate family prevented:",
            family
        );
        return null;
    }

    renderedFamilies.add(family._id);


    // --------------------------------------------------------
    // Family LI
    // --------------------------------------------------------

    const familyLI =
        document.createElement("li");

    familyLI.className =
        "family-node";

    // --------------------------------------------------------
    // Family card
    // --------------------------------------------------------

    const card =
        document.createElement("div");

    card.className =
        "member-card";

    // --------------------------------------------------------
    // PERSON
    // --------------------------------------------------------

    (family.person || []).forEach(function (id) {
        const person =
            createPerson(id);

        if (!person) return;

        if (card.children.length > 0) {
            addHeart(card);
        }
        card.appendChild(person);
    });

    // --------------------------------------------------------
    // SPOUSE
    // --------------------------------------------------------

    (family.spouse || []).forEach(function (id) {
        const spouse =
            createPerson(id);

        if (!spouse) return;

        if (card.children.length > 0) {
             addHeart(card);
        }

        card.appendChild(spouse);
    });


    // --------------------------------------------------------
    // CHILDREN
    // --------------------------------------------------------

    const children =
        family.child || [];

    if (children.length > 0) {

        // Toggle button
        const toggle =
            document.createElement("div");

        toggle.className =
            "toggle-badge";

        toggle.textContent =
            "+";


        toggle.addEventListener(
            "click",
            function (event) {
                event.stopPropagation();
                toggleBranch(card);
            }
        );

        card.appendChild(toggle);

        // Children UL

        const childrenUL =
            document.createElement("ul");

        childrenUL.className =
            "family-children";

        // ----------------------------------------------------
        // Each child
        // ----------------------------------------------------

        children.forEach(function (childID) {


            /*
             * THIS IS THE IMPORTANT LINE.
             *
             * It checks whether this child later becomes
             * a parent/spouse in another family.
             */

            const childFamily =
                familyByMember.get(childID);

            // ------------------------------------------------
            // Child has own family
            // ------------------------------------------------

            if (childFamily) {
                const childNode =
                    createFamilyNode(
                        childFamily,
                        familyByMember,
                        renderedFamilies
                    );

                if (childNode) {
                    childrenUL.appendChild(
                        childNode
                    );
                }
            }


            // ------------------------------------------------
            // Child has no family
            // ------------------------------------------------

            else {

                const childLI =
                    document.createElement("li");

                childLI.className =
                    "family-node";

                const childCard =
                    document.createElement("div");

                childCard.className =
                    "member-card";

                const childPerson =
                    createPerson(childID);

                if (childPerson) {

                    childCard.appendChild(
                        childPerson
                    );
                }

                childLI.appendChild(
                    childCard
                );

                childrenUL.appendChild(
                    childLI
                );
            }
        });

        // ----------------------------------------------------
        // Attach card and children
        // ----------------------------------------------------

        familyLI.appendChild(card);
        familyLI.appendChild(childrenUL);
    }

    else {
        familyLI.appendChild(card);
    }

    // --------------------------------------------------------
    // Clicking family card
    // --------------------------------------------------------

    card.addEventListener(
        "click",
        function () {
            toggleBranch(card);
        }
    );


    return familyLI;
}


// ============================================================
// CREATE PERSON
// ============================================================

function createPerson(id) {
    const data =
        getPerson(id);

    if (!data) {
        console.warn(
            "Missing member ID:",
            id
        );
        return null;
    }


    const person =
        document.createElement("div");


    person.className =
        "person";


    person.dataset.img =
        `./Photo/${data.photo}`;


    person.dataset.name =
        data.name || "";


    person.dataset.lifetime =
        data.lifetime || "";


    person.dataset.hometown =
        data.hometown || "";


    person.dataset.occupation =
        data.occupation || "";


    person.dataset.contact =
        data.contact || "";



    const img =
        document.createElement("img");


    img.className =
        "member-avatar";


    img.src =
        `./Photo/${data.photo}`;


    img.alt =
        data.name || "";



    const name =
        document.createElement("span");


    name.className =
        "member-name";


    name.textContent =
        data.name || "";



    const lifetime =
        document.createElement("span");


    lifetime.className =
        "lifetime";


    lifetime.textContent =
        data.lifetime || "";



    person.appendChild(img);

    person.appendChild(name);

    person.appendChild(lifetime);


    return person;

}


// ============================================================
// HEART BETWEEN COUPLE
// ============================================================

function addHeart(card) {

    const heart =
        document.createElement("div");


    heart.className =
        "couple-divider";


    heart.textContent =
        "❤️";


    card.appendChild(heart);

}
// ============================================================
// TOGGLE
// ============================================================

function toggleBranch(element) {

    const card =
        element.closest(".member-card");


    if (!card) return;


    const li =
        card.parentElement;


    const children =
        li.querySelector(":scope > ul");


    if (!children) return;


    li.classList.toggle("collapsed");

}
// ============================================================
// SIDE PANEL
// ============================================================

function initializeSidePanel() {

    const sidePanel =
        document.getElementById(
            "sidePanel"
        );

    const panelPhoto =
        document.getElementById(
            "panelPhoto"
        );

    const panelTitle =
        document.getElementById(
            "panelTitle"
        );

    const panelDesc =
        document.getElementById(
            "panelDesc"
        );


    if (!sidePanel) return;


    let hideTimer;


    document.addEventListener(
        "mouseover",
        function (event) {

            const person =
                event.target.closest(
                    ".person"
                );


            if (!person) return;


            const related =
                event.relatedTarget;


            if (
                related &&
                person.contains(
                    related
                )
            ) {
                return;
            }


            clearTimeout(
                hideTimer
            );


            panelPhoto.src =
                person.dataset.img;

            panelPhoto.alt =
                person.dataset.name;


            panelTitle.textContent =
                person.dataset.name;


            panelDesc.innerHTML = `

                <div class="panel-row">
                    <span class="panel-label">
                        <b>জীবনকাল:</b>
                    </span>
                    ${person.dataset.lifetime}
                </div>

                <div class="panel-row">
                    <span class="panel-label">
                        <b>জন্মস্থান:</b>
                    </span>
                    ${person.dataset.hometown}
                </div>

                <div class="panel-row">
                    <span class="panel-label">
                        <b>পেশা:</b>
                    </span>
                    ${person.dataset.occupation}
                </div>

                <div class="panel-row">
                    <span class="panel-label">
                        <b>যোগাযোগ:</b>
                    </span>
                    ${person.dataset.contact}
                </div>

            `;


            sidePanel.classList.add(
                "active"
            );

        }
    );


    document.addEventListener(
        "mouseout",
        function (event) {

            const person =
                event.target.closest(
                    ".person"
                );

            if (!person) return;


            const related =
                event.relatedTarget;


            if (
                related &&
                person.contains(
                    related
                )
            ) {
                return;
            }


            hideTimer =
                setTimeout(
                    function () {

                        sidePanel.classList.remove(
                            "active"
                        );

                    },
                    150
                );

        }
    );


    sidePanel.addEventListener(
        "mouseenter",
        function () {

            clearTimeout(
                hideTimer
            );

        }
    );


    sidePanel.addEventListener(
        "mouseleave",
        function () {

            sidePanel.classList.remove(
                "active"
            );

        }
    );

}


// ============================================================
// PHOTO VIEWER
// ============================================================

function initializePhotoViewer() {

    const modal =
        document.getElementById("photoModal");


    const fullPhoto =
        document.getElementById("fullPhoto");


    const download =
        document.getElementById("photoDownload");


    if (!modal || !fullPhoto || !download) {
        return;
    }


    document.addEventListener(
        "click",
        function (event) {

            const photo =
                event.target.closest(
                    ".member-avatar"
                );


            if (!photo) return;


            event.stopPropagation();


            fullPhoto.src =
                photo.src;


            download.href =
                photo.src;


            modal.classList.add("active");

        }
    );


    modal.addEventListener(
        "click",
        function (event) {

            if (event.target === modal) {

                modal.classList.remove(
                    "active"
                );

            }

        }
    );


    document.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Escape") {

                modal.classList.remove(
                    "active"
                );

            }

        }
    );

}
