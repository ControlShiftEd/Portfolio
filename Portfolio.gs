// The tab name for your portfolio.
var portfolio = "Portfolio"

// ID for template slide. TODO: Make it selectable by user.
var templateSlideID = "1NvIum_IB-2wUZSCeVFlcOTj5xV4e7cysBcnOifkhZj4"

// The column name to identify students. This should be a unique identifier, such as an email.
var email = PropertiesService.getDocumentProperties().getProperty("IDCol");

// The column name for the student grades.
var comment = PropertiesService.getDocumentProperties().getProperty('commentCol');

function exportPortfolio() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getActiveSheet();


  // Get values from Spreadsheet
  if (sh.getName() != portfolio){
    var data = sh.getDataRange().getValues();
    var emailIndex = data[0].indexOf(email); // Get Email column, selected by the user.
    var commentIndex = data[0].indexOf(comment);  // Get Comment column, selected by user.

    // Try to get the Responses to a linked form. If form is not linked, grab the responses from the sheet instead, between the email and the comment column.
    try {
      var formResponses = FormApp.openByUrl(sh.getFormUrl()).getResponses();
      // Logger.log("Found Form")
    } catch (e) {
      // Logger.log("Did not find form")
      var formResponses = sh.getRange(1,emailIndex+2, sh.getLastRow(), commentIndex-2).getValues();
    }

    // Place all values in an easily retrievable Array that will be passed to sortComments(). If there's an error, it's likely because the email and comment columns were not set properly.
    try {
      var studentComments = [
        sh.getRange(2,emailIndex+1,sh.getLastRow()-1).getValues(),
        formResponses,
        sh.getRange(2,commentIndex+1,sh.getLastRow()-1).getValues()
      ];
    } catch (e) {
      return "Identifier doesn't match or can't be found in portfolio. Select identifiers through the hamburger icon in the top right, or make sure they're correct in the portfolio tab."
    }

    // Start sorting comments
    sortComments(studentComments);

  } else {
    // If the person is trying to export from the Portfolio tab, return this error.
    return "Cannot export from Portfolio Tab."
  }
  // If everything completed successfully, return this.
  return "Exported comments to Portfolios."
}


/* Function to create a portfolio for the student.
* Grab the student ID, name, and their row in the Portfolio tab.
* In theory, the row # is dependant on whether their ID matches the ID from the form. You could switch their spot, and it wouldn't affect the script in a negative way.
* If the script can't get the URL for the document (because it's in the trash or otherwise), the script will create a new portfolio for the person.
*/
function createStudentPortfolio(student, name, row){

  // Grab the Portfolio URLs
  var portfolioSheet = SpreadsheetApp.getActive().getSheetByName(portfolio);
  var portfolioURL = portfolioSheet.getRange(row,portfolioSheet.getLastColumn())

  // Create folders for the User to put all the portfolios in one place. Calls on the createPortfolioFolder() function.
  var classFolderID = DriveApp.getFolderById(createPortfolioFolder());

  // Create a new Portfolio with the student and gives them editor access. Move it to the user's portfolio folder. **TODO: Make it selectable by the user?**
  var newPortfolio = SlidesApp
    .create(name+' Portfolio')
    .addEditor(student);
  DriveApp.getFileById(newPortfolio.getId()).moveTo(classFolderID);

  // Set the URL in the Portfolio Tab.
  portfolioURL.setValue(newPortfolio.getUrl());

  // When you create a new Slide, the first slide will be the default. These next commands are to remove the default first slide, replace it with the first slide from the template, then name the Portfolio.
  newPortfolio.getSlides()[0].remove();
  newPortfolio.appendSlide(SlidesApp.openById(templateSlideID).getSlides()[0]);
  newPortfolio.getSlides()[0].replaceAllText("{{Portfolio Name}}", name+' Portfolio');

  // Return this prompt if everything worked.
  return "Created portfolios."
}

/* 
* The main function to the whole operation. This is where the magic happens. I will do my best to break everything down.
*/
function sortComments(studentComments) {

  // Grab the Portfolio sheet, then get the Portfolio URLs, the StudentIDs and the Student Names.
  var ss = SpreadsheetApp.getActive();
  var portfolioSheet = ss.getSheetByName(portfolio);
  var portfolioURL = portfolioSheet.getRange(row,portfolioSheet.getLastColumn())
  var studentList = portfolioSheet.getRange(2,1,portfolioSheet.getLastRow()-1).getValues();
  var studentName = portfolioSheet.getRange(2,2,portfolioSheet.getLastRow()-1).getValues();

  // The array loops I use here are more efficient from what I can tell, but give random values which can't be directly translated to a row or column integer. They only seem to work for the loop itself. I have to therefore create a variable for the row number.
  var row = 2;

  // For all the students in the Portfolio Tab...
  for (var l in studentList) {
    // Logger.log(studentList[l]);

    // For all the students who filled a response...
    for (var s = 0; s < studentComments[0].length; s++){
      // Logger.log(studentComments[0][s])
      if (studentComments[0][s].toString() == studentList[l].toString()) {
        // Logger.log(studentList[l]+' - '+studentComments[0][s]+' - '+studentComments[2][s]);

        try {
          // Logger.log("Found Item Responses")
          var formResponse = studentComments[1][s].getItemResponses();
        } catch (e) {
          // Logger.log("Did not find Item Responses")
          formResponse = studentComments[1][s];
        }
      
        try {
          // Logger.log("Portfolio Found")
          var studentPortfolio = SlidesApp.openByUrl(portfolioURL.getValue());
        } catch (e) {
          // Logger.log("Cannot find student Portfolio. Creating new one.")
          var currentStudent = studentList[l].toString();
          var studentName = studentName[l].toString();
          createStudentPortfolio(currentStudent, studentName, row);
          var studentPortfolio = SlidesApp.openByUrl(portfolioURL.getValue());
        }

        var currentSlide = studentPortfolio.appendSlide(SlidesApp.openById(templateSlideID).getSlides()[1]);
        currentSlide.replaceAllText("{{Title}}", "Commentaire de la r??ponse "+ss.getActiveSheet().getName());
        var responsePlaceholderArray = [];
        for (var r in formResponse) {
          responsePlaceholderArray.push("{{Response "+r+"}}\n")
        }
        currentSlide.replaceAllText("{{Response}}", responsePlaceholderArray)
        for (var r in responsePlaceholderArray) {
          try {
            currentSlide.replaceAllText("{{Response "+r+"}}", "Question: "+formResponse[r].getItem().getTitle()+"\n"+formResponse[r].getResponse());
          } catch (e) {
            currentSlide.replaceAllText("{{Response "+r+"}}", "Question: "+studentComments[1][0][r]+"\n"+studentComments[1][s+1][r]);
          }
        }
        currentSlide.replaceAllText("{{Comment}}", studentComments[2][s]);

          

        // Logger.log(studentComments);
        break
      };
    };
    row += 1;
  };
}