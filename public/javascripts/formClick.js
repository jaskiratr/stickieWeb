    
    var newForm = document.getElementById('newForm');
    if (newForm != null) {
        new stepsForm(newForm, {
            onSubmit: function(form) {
                classie.addClass(newForm.querySelector('.newForm-inner'), 'hide');
                var messageEl = newForm.querySelector('.final-message');
                messageEl.innerHTML = 'Preparing your session...'; //
                classie.addClass(messageEl, 'show');
                function newSession() {
                    teamName = $('#q1newForm').val();
                      window.location.href = ("https://stickie2-jaskiratr.c9users.io/" + sessionId);
                }setTimeout(newSession, 1500);
            }
        });
    }
  
    var joinForm = document.getElementById('joinForm');
    if (joinForm != null) {    
        new stepsForm(joinForm, {
            onSubmit: function(form) {
                classie.addClass(joinForm.querySelector('.joinForm-inner'), 'hide');
                // var messageEl = joinForm.querySelector('.final-message');
                // messageEl.innerHTML = 'Preparing your session...';
                // classie.addClass(messageEl, 'show');
                window.location.href = ("https://stickie2-jaskiratr.c9users.io/" + $('#q1joinForm').val());
            }
        });
    }
    
    var teamForm = document.getElementById('teamForm');
    if (teamForm != null) {    
        // console.log(teamForm);
        new stepsForm(teamForm, {
            onSubmit: function(form) {
                classie.addClass(teamForm.querySelector('.teamForm-inner'), 'hide');
                var messageEl = teamForm.querySelector('.final-message');
                messageEl.innerHTML = 'Preparing your session...';
                classie.addClass(messageEl, 'show');
                teamName = $('#q1teamForm').val();
                connectSocket(sessionId, teamName); // session.js
                $("body").css("background-color", "#fff");
                $("section").css("background-color", "#fff");
                setTimeout(function(){ 
                    $(".container").fadeOut(400); 
                    $(".codrops-header").fadeOut(400); 
                    $("section").fadeOut(400,function(){
                        $("#threeCanvas").fadeIn(400);
                    }); 
                }, 2000);
            }
        });
    }
    

    $(document).ready(function() {
        setTimeout(function(){ 
            // $(".container").fadeOut(1000); 
            // $(".codrops-header").fadeOut(1000); 
            // $("section").fadeOut(1000); 
            $("#teamForm").fadeIn(400);
            $("#teamForm-inner").fadeIn(400);
        }, 100);
        // $(".container").fadeIn(1000); 
        // $(".codrops-header").fadeIn(1000); 
        // $("section").fadeIn(1000); 
        // $("#threeCanvas").fadeIn(1000);
                    
        $("#joinSessionButton").click(function() {
            $("#sessionButtons").fadeOut(300, function() {
                $("#joinForm").fadeIn(400);
                $("#joinForm-inner").fadeIn(400);
            });
        });
        
        $("#newSessionButton").click(function() {
              $("#sessionButtons").fadeOut(400,function() {
                  window.location.href = ("https://stickie2-jaskiratr.c9users.io/" + sessionId);  
              });
        });
        
    });
    
    $(window).keydown(function(e) {
        // console.log(e);
      switch (e.keyCode) {
        case 78: // left arrow key
        //   e.preventDefault(); // avoid browser scrolling due to pressed key
          // TODO: go to previous image
          console.log("n pressed");
          $('#newSessionButton').trigger( "click" );
          return;
        case 74: // up arrow key
        //   e.preventDefault();
          console.log("j pressed");
          $('#joinSessionButton').trigger( "click" );
          // TODO: go to next image
          return;
      }
    });
