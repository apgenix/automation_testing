//Developed by Intelizign Lifecycle Services Pvt. Ltd.(ILS).
//Script:DRX_configMetadataUpdate.js
//Author:AnandKumar Sawwalakhe
//Purpose:If allowed baseline name is present in revision history then getting all details of document with that particular revision....
var logFile = new java.io.FileWriter("./logs/main/Job Schedular.log", false);
var logWriter = new java.io.BufferedWriter(logFile);
var currentDateTime = new java.util.Date().toString();
var txService = com.polarion.platform.core.PlatformContext.getPlatform().lookupService(com.polarion.platform.ITransactionService.class);
var projectId = scope.id.toString().split(" ");
projectId = projectId[projectId.length - 1];
projectId = projectId.substring(0, projectId.length - 1);
logger.info("Testing"+" "+projectId);
var userVault = userVault;
function CreatRepFunctionWithRW() {
	try {
		var projectMainObject = projectService.getProject(projectId);
		var project = trackerService.getTrackerProject(projectId);
		var workItems = trackerService.queryWorkItems(projectMainObject, "type:ConfigurationItem AND HAS_VALUE:SourceDocument.KEY", "project id");
		
		for (var i = 0; i < workItems.length; i++) {
			var workItem = workItems[i];
			var space1 = workItem.getCustomField("SourceDocument").getId();
			space = space1.split("");
			space.splice(space.indexOf("/") - 1, 1);
			space.splice(space.indexOf("/") + 1, 1)
			space = space.join("");
			var spaceLocation = com.polarion.subterra.base.location.Location;
			var spaceLoc = spaceLocation.getLocation(space);
			var doc = trackerService.getModuleManager().getModule(project, spaceLoc);
			var allowedBaselineNames = workItem.getCustomField("allowedBaselineNames");
			
			getBaseRevision(doc, allowedBaselineNames, workItem, updateWorkItem);
		}
	}
	catch (runtimeException) {
		logWriter.write(currentDateTime + "\tRuntime Exception Occured: " + runtimeException + "\n");
	}
}

function getBaseRevision(doc, allowedBaselineNames, workItem, callback) {
	var sql = "select baseline.c_uri from baseline inner join module on baseline.fk_uri_baseobject = module.c_uri where true and module.c_id='" + doc.getId() + "'";
	var baselinesDoc = trackerService.getDataService().sqlSearch(sql);
	var baselineData = {
		revisionNo: '',
		revisionName: '',
		docName: '',
		id: '',
		docStatus: '',
		doctype: '',
		creationDate: '',
		docOwner: ''
	};

	for (var i = 0; i < baselinesDoc.length; i++) {
		var revisionNo = baselinesDoc[i].getBaseRevision();
		var revisionName = baselinesDoc[i].getName();

		if ((revisionName == allowedBaselineNames) && allowedBaselineNames != null) {
			var docDataService = trackerService.getDataService();
			var docRev = docDataService.getVersionedInstance(doc.getObjectId(), revisionNo);
			baselineData = {
				revisionNo: revisionNo,
				revisionName: revisionName,
				docName: docRev.getTitleOrName(),
				logger.info("DocName"+docName);
				id: docRev.getId(),
				docStatus: docRev.getStatus().getName(),
				doctype: docRev.getType().getName(),
				creationDate: docRev.getCreated(),
				docOwner: (docRev.getCustomField("documentOwner") != null) ? docRev.getCustomField("documentOwner").getId() : ""
			}
			break;
		}
	}

	callback(baselineData, workItem)
}
function updateWorkItem(baselineData, workItem) {
	if (baselineData.revisionName != '') {
		workItem.setCustomField("SourceRevision", baselineData.revisionNo);
		workItem.setCustomField("baseline", baselineData.revisionName);
		workItem.setCustomField("src_md_Name", baselineData.docName);
		workItem.setCustomField("src_md_ID", baselineData.id);
		workItem.setCustomField("src_md_Status", baselineData.docStatus);
		workItem.setCustomField("src_md_Type", baselineData.doctype);
		workItem.setCustomField("src_md_CreationDate", baselineData.creationDate);
		workItem.setCustomField("src_md_Owner", baselineData.docOwner);
		txService.beginTx();
		workItem.save();
		txService.commitTx();
	}
}
// Login with a user with RW access that was added to the Polarion Account Vault
// and identified with the key "rProject.key"
var securityService = trackerService.getDataService().getSecurityService();
var userWithRWAccess = securityService.loginUserFromVault(userVault, "system");
// Create a Privileged Action object that will be run by the doAsUser function
// with our user with RW access
var privilegedAction = Java.extend(Java.type('java.security.PrivilegedAction'));
var privilegedActionImpl = new privilegedAction({
	run: function () {
		{
			//logger.info('User used by doAsUser to execute this call is: ' + securityService.getCurrentSubject().toString());
			//  logWriter.write(currentDateTime + "\tUser used by doAsUser to execute this call is:  " + securityService.getCurrentSubject().toString() + "\n");
			// Our call to the function requiring RW access
			CreatRepFunctionWithRW();

			return null;
		}
	}
});
securityService.doAsUser(userWithRWAccess, privilegedActionImpl);

logWriter.flush();