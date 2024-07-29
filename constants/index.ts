export const viewIcon = 'M12 4.5c-7.8 0-12 7.5-12 7.5s4.2 7.5 12 7.5 12-7.5 12-7.5-4.2-7.5-12-7.5zm0 13c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6zm0-10.5c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5 4.5-2 4.5-4.5-2-4.5-4.5-4.5z';

export const createIcon = 'M10 20l-5.293-5.293 1.414-1.414L10 17.172l8.879-8.879 1.414 1.414z';

export const bookmarkIcon = 'M6 4c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v18l-7-3-7 3V4z';

export const dashboardStyle = `
		.notification-dashboard {
			padding: 20px;
		}
		.notification-header {
			display: flex;
			justify-content: space-between;
        	align-items: center; /* Align items vertically */
        	padding: 10px;
        	border-bottom: 1px solid #e1e4e8;
        	font-weight: bold;
    	}
		.notification-header .done-header-button {
			display: none; /* Initially hide the done button */
		}
		.notification-header .done-header-button.visible {
			display: inline-block; /* Show when the visible class is added */
		}
    	.notification {
    	    display: flex;
    	    justify-content: space-between;
    	    padding: 10px;
    	    border-bottom: 1px solid #e1e4e8;
    	    transition: background-color 0.2s ease-in-out;
    	    height: 40px; /* Set a fixed height */
    	    align-items: center; 
    	}
    	.notification-checkbox {
    	    margin-right: 10px;
    	}
    	.notification-title {
    	    font-weight: bold;
    	    margin-right: 10px;
    	    flex: 1;
    	}
    	.notification-buttons-container-hidden {
    	    display: none;
    	    flex-direction: row;
    	    gap: 5px;
    	}
    	.highlighted {
    	    background-color: var(--background-modifier-hover);
    	}	
		`;


