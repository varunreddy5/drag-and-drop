var SimpleUndoRedo = {};

// Commands with `execution` and `undo` functions for redo and undo.
var commands = {};

// Commands names list
// Undo and Redo History
var list = [];

// Current command index on list.
var current = 0;

// Return the current command object.
var currentCommand = function() {
  var name = list[current];
  return commands[name];
};

// Add a new command to the list (name shortcut). `name` must be a string, and `command`
// must be an object which responds to the `execute` and `undo` methods.
SimpleUndoRedo.addCommand = function(name, command) {
  commands[name] = command;
  list = list.slice(0, current);
  list.push(name);
  current += 1;
  document.getElementById("redo").disabled = false;
  document.getElementById("undo").disabled = false;
};

// Check if the the next command can be `undone`.
SimpleUndoRedo.canUndo = function() {
  return current > 0;
};

// Check if the next command can be `redone`.
SimpleUndoRedo.canRedo = function() {
  return current < list.length;
};

// Undo the previous command.
SimpleUndoRedo.undo = function() {
  // Stop if there are no previous elements on the list.
  if(!SimpleUndoRedo.canUndo()) {
    return false;
  }
  
  document.getElementById("redo").disabled = false;
  // Move back, and undo the previous command.
  current -= 1;
  if(current == 0) {
    document.getElementById("undo").disabled = true;
  }
  currentCommand().undo();
  return true;
};

// Redo the next command.
SimpleUndoRedo.redo = function() {
  // Stop if there are no next elements on the list.
  if(!SimpleUndoRedo.canRedo()) {
    return false;
  }
  
  document.getElementById("undo").disabled = false;
  // Move forward, and execute the next command.
  currentCommand().execute();
  current += 1;
  if(current == list.length) {
    document.getElementById("redo").disabled = true;
  }
  return true;
};

// Generate a unique string for command names
function uniqueString() {
  return Math.random().toString(36).substr(2, 5);
}

document.addEventListener("DOMContentLoaded", function(event) {

  // To keep track of reward positions in respective categories
  var positionsObj = {};

  var rewards = document.getElementsByClassName('rewards')[0];

  new Sortable(rewards, {
    group: {
      name: 'shared',
      pull: 'clone',
      put: false
    },
    animation: 200,
    sort: false
  });


  // Remove a particular reward from a category array
  // Ex: removeFromArray(c3, r2) - Remove reward r2 from category c3
  function removeFromArray(categoryKey, value) {
    if(positionsObj.hasOwnProperty(categoryKey)) {
      const index = positionsObj[categoryKey].indexOf(value);
      if (index > -1) {
        positionsObj[categoryKey].splice(index, 1);
      }
    }
  }

  // When clicked on 'x', remove reward from that category
  function removeReward(event) {
    var parentNode = event.target.parentNode;
    var rewardId = parentNode.getAttribute('data-reward');
    var categoryId = parentNode.parentNode.getAttribute('data-category');

    removeFromArray(categoryId, rewardId);
    parentNode.remove();

    // For undo and redo.
    // redo = Remove the reward from DOM.
    // undo = Append the reward to DOM.
    SimpleUndoRedo.addCommand(uniqueString(), {
      execute: function() {
        event.target.parentNode.remove();
        removeFromArray(categoryId, rewardId);
      },
      undo: function() {
        document.querySelector(`[data-category=${categoryId}]`).appendChild(parentNode);
        positionsObj[categoryId].push(rewardId);
      }
    });
  }

  var categories = document.querySelectorAll('[data-category]');

  categories.forEach(function(el) {
    new Sortable(el, {
      group: {
        name: 'shared'
      },
      animation: 200,
      
      onAdd: function(evt) {
        // The reward being dropped, from the rewards swimlane or another category's swimlane.
        var item = evt.item;
        var reward = item.getAttribute('data-reward');

        // The category the reward is being dropped into.
        var category = evt.to.getAttribute('data-category');

        // Add dropped reward into respective category's array. 
        // Prevent adding duplicate rewards into the same category.
        if(positionsObj.hasOwnProperty(category)) {
          if(positionsObj[category].includes(reward)) {
            item.remove(); // Remove duplicate rewards
          } else {
            positionsObj[category].push(reward);
            
            // For Undo and Redo.
            // redo = Append the reward to that particular category.
            // undo = Remove from DOM.
            SimpleUndoRedo.addCommand(uniqueString(), {
              execute: function() {
                evt.to.appendChild(item);
                positionsObj[category].push(reward);
              },
              undo: function() {
                item.remove();
                removeFromArray(category, reward);
              }
            });

          }
        } else {
          positionsObj[category] = [];
          positionsObj[category].push(reward);

          // For Undo and Redo.
          SimpleUndoRedo.addCommand(uniqueString(), {
            execute: function() {
              evt.to.appendChild(item);
              positionsObj[category].push(reward);
            },
            undo: function() {
              item.remove();
              removeFromArray(category, reward);
            }
          });
        }

        // When a reward is dragged from one category swimlane into another,
        // remove the reward from past category's array.
        if(evt.from.hasAttribute('data-category')) {
          // The category the reward is being dragged from
          var fromCategory = evt.from.getAttribute('data-category');

          if(positionsObj.hasOwnProperty(fromCategory)) {
            if(positionsObj[fromCategory].includes(reward)) {
              removeFromArray(fromCategory, reward);
            }
          }

          // For Undo and Redo.
          // redo = Append the reward to the category it was dropped in.
          // undo = Append the reward to the category it was dragged from.
          SimpleUndoRedo.addCommand(uniqueString(), {
            execute: function() {
              evt.to.appendChild(item);
              positionsObj[category].push(reward);
              removeFromArray(fromCategory, reward);
            },
            undo: function() {
              evt.from.appendChild(item);
              removeFromArray(category, reward);
              positionsObj[fromCategory].push(reward);
            }
          });

        } 

        // When clicked on 'x', remove reward from that category.
        item.querySelector('.remove').addEventListener('click', function(event) {
          removeReward(event);
        });

      },
      onMove: function(evt) {
        // When dragging between category swimlanes, prevent duplicate rewards from dropping in.
        var rewardsInTargetCategory = [];
        var target = evt.to.children;
        for (i = 0; i < target.length; i++) {
          rewardsInTargetCategory.push(target[i].getAttribute('data-reward'));
        }
        if(rewardsInTargetCategory.includes(evt.dragged.getAttribute('data-reward'))) {
          return false; // Disallow dropping.
        }
      }

    });
  });

  // Undo button.
  document.getElementById("undo").addEventListener("click", function(){
    SimpleUndoRedo.undo();
  });

  // Redo button.
  document.getElementById("redo").addEventListener("click", function(){
    SimpleUndoRedo.redo();
  });

  // Save the layout in localStorage.
  document.getElementById("save").addEventListener("click", function(){
    localStorage.setItem("rewardsLayout", JSON.stringify(positionsObj));
    if(localStorage.getItem('rewardsLayout') != null) {
      alert("Successfully saved in localStorage!");
      document.getElementById("clear").style.display = 'block';
    }
  });

  // Clear key from localStorage.
  document.getElementById("clear").addEventListener("click", function(){
    localStorage.removeItem("rewardsLayout");
    // alert("Successfully cleared!");
    this.style.display = 'none';
    window.location.reload();
  });

  // If a layout is saved in localStorage, fetch and show.
  var rewardsLayoutJson = localStorage.getItem('rewardsLayout');
  if (rewardsLayoutJson != null) {
    document.getElementById('clear').style.display = 'block';
    var rewardsLayout = JSON.parse(rewardsLayoutJson);
    positionsObj = rewardsLayout;
    for(let key in rewardsLayout) {
      var categoryNode = document.querySelector(`[data-category=${key}]`);
      rewardsLayout[key].forEach(function(rewardId){
        var rewardNode = document.querySelector(`[data-reward=${rewardId}]`).cloneNode(true);
        categoryNode.appendChild(rewardNode);
      });
    }

    // Click event on Remove ('x') for rewards fetched from localStorage.
    document.querySelectorAll('.remove').forEach(function(item) {
      item.addEventListener('click', function(event) {
        removeReward(event);
      });
    });
  }

});


