
interact('.resize-drag')
  .resizable({
    // resize from all edges and corners
    edges: { left: true, right: true, bottom: true, top: true },

    listeners: {
      move (event) {
        var target = event.target
        var x = (parseFloat(target.getAttribute('data-x')) || 0)
        var y = (parseFloat(target.getAttribute('data-y')) || 0)

        // update the element's style
        target.style.width = event.rect.width + 'px'
        target.style.height = event.rect.height + 'px'

        // translate when resizing from top or left edges
        x += event.deltaRect.left
        y += event.deltaRect.top

        target.style.transform = 'translate(' + x + 'px,' + y + 'px)'

        target.setAttribute('data-x', x)
        target.setAttribute('data-y', y)
        target.textContent = Math.round(event.rect.width) + '\u00D7' + Math.round(event.rect.height)
      }
    },
    modifiers: [
      // keep the edges inside the parent
      interact.modifiers.restrictEdges({
        outer: 'parent'
      }),

      // minimum size
      interact.modifiers.restrictSize({
        min: { width: 100, height: 50 }
      })
    ],

    inertia: true
  })
  .draggable({
    listeners: { move: window.dragMoveListener },
    inertia: true,
    modifiers: [
      interact.modifiers.restrictRect({
        restriction: 'parent',
        endOnly: true
      })
    ]
  })import interact from 'https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js';

// Initialize interact.js resizable
interact('.resize-item').resizable({
  edges: { right: true },
  
  modifiers: [
    // Keep the edges inside the parent
    interact.modifiers.restrictEdges({
      outer: '.resize-container'
    }),
    
    // Minimum size
    interact.modifiers.restrictSize({
      min: { width: 60 }
    })
  ],

  listeners: {
    start(event) {
      console.log('Resize started');
      event.target.classList.add('resizing');
    },
    
    move(event) {
      const target = event.target;
      let width = event.rect.width;
      
      // Update element width
      target.style.width = `${width}px`;
      
      // Log the new size
      console.log(`New width: ${width}px`);
    },
    
    end(event) {
      console.log('Resize ended');
      event.target.classList.remove('resizing');
    }
  }
});

// Create example elements
document.addEventListener('DOMContentLoaded', () => {
  const container = document.createElement('div');
  container.className = 'resize-container';
  
  const item = document.createElement('div');
  item.className = 'resize-item';
  item.textContent = 'Resize me!';
  
  const handle = document.createElement('div');
  handle.className = 'resize-handle right';
  
  item.appendChild(handle);
  container.appendChild(item);
  document.body.appendChild(container);
});
