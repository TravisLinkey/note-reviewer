import { ItemView } from 'obsidian';
import { NotificationComponent } from './notification';
export const VIEW_TYPE_NOTIFICATION_DASHBOARD = 'notification-dashboard-view';
export class NotificationDashboardView extends ItemView {
    constructor(leaf, notifications) {
        super(leaf);
        this.notifications = [];
        this.notifications = notifications;
    }
    getViewType() {
        return VIEW_TYPE_NOTIFICATION_DASHBOARD;
    }
    getDisplayText() {
        return "Notification Dashboard";
    }
    async onOpen() {
        this.initUI();
    }
    async onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    initUI() {
        const { contentEl } = this;
        // Add a style block for custom styles
        const style = document.createElement('style');
        style.textContent = `
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
    	.notification-buttons-container {
    	    display: none;
    	    flex-direction: row;
    	    gap: 5px;
    	}
    	.highlighted {
    	    background-color: var(--background-modifier-hover);
    	}	
		`;
        document.head.appendChild(style);
        // Main container
        const container = contentEl.createEl('div', { cls: 'notification-dashboard' });
        // Header
        const headerEl = container.createEl('div', { cls: 'notification-header' });
        // Select All Checkbox
        const selectAllCheckboxEl = headerEl.createEl('input', { type: 'checkbox', cls: 'notification-checkbox' });
        selectAllCheckboxEl.addEventListener('change', () => this.toggleSelectAll(selectAllCheckboxEl.checked));
        // Title Label
        headerEl.createEl('div', { text: 'Select all', cls: 'notification-title' });
        // Done Button
        const doneHeaderButton = headerEl.createEl('button', { text: 'Done', cls: 'notification-button done-header-button' });
        doneHeaderButton.addEventListener('click', () => {
            this.markAllDone();
        });
        // Add notifications to the container
        this.notifications.forEach((notification) => new NotificationComponent(this.app, container, notification));
    }
    toggleSelectAll(checked) {
        const checkboxes = this.contentEl.querySelectorAll('.notification-checkbox');
        checkboxes.forEach((checkbox) => {
            checkbox.checked = checked;
        });
        this.updateDoneButtonVisibility();
    }
    markAllDone() {
        const notifications = this.contentEl.querySelectorAll('.notification');
        notifications.forEach((notification) => notification.remove());
    }
    // Add the updateDoneButtonVisibility method to NotificationDashboardView class
    updateDoneButtonVisibility() {
        const checkboxes = this.contentEl.querySelectorAll('.notification-checkbox:checked');
        const doneHeaderButton = this.contentEl.querySelector('.done-header-button');
        if (doneHeaderButton) {
            if (checkboxes.length > 0) {
                doneHeaderButton.classList.add('visible');
            }
            else {
                doneHeaderButton.classList.remove('visible');
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uLWRhc2hib2FyZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm5vdGlmaWNhdGlvbi1kYXNoYm9hcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFFBQVEsRUFBaUIsTUFBTSxVQUFVLENBQUM7QUFDbkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFHdkQsTUFBTSxDQUFDLE1BQU0sZ0NBQWdDLEdBQUcsNkJBQTZCLENBQUM7QUFFOUUsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFFBQVE7SUFHdEQsWUFBWSxJQUFtQixFQUFFLGFBQXFCO1FBQ3JELEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUhMLGtCQUFhLEdBQVcsRUFBRSxDQUFDO1FBSWxDLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDO0lBQ3BDLENBQUM7SUFFRCxXQUFXO1FBQ1YsT0FBTyxnQ0FBZ0MsQ0FBQztJQUN6QyxDQUFDO0lBRUQsY0FBYztRQUNiLE9BQU8sd0JBQXdCLENBQUM7SUFDakMsQ0FBQztJQUVELEtBQUssQ0FBQyxNQUFNO1FBQ1gsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2YsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPO1FBQ1osTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQztRQUUzQixTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDbkIsQ0FBQztJQUVELE1BQU07UUFDTCxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRTNCLHNDQUFzQztRQUN0QyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzlDLEtBQUssQ0FBQyxXQUFXLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0EyQ25CLENBQUM7UUFDRixRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVqQyxpQkFBaUI7UUFDakIsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxHQUFHLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDO1FBRS9FLFNBQVM7UUFDVCxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLEdBQUcsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLENBQUM7UUFFM0Usc0JBQXNCO1FBQ3RCLE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSx1QkFBdUIsRUFBRSxDQUFDLENBQUM7UUFDM0csbUJBQW1CLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUV4RyxjQUFjO1FBQ2QsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRSxvQkFBb0IsRUFBRSxDQUFDLENBQUM7UUFFNUUsY0FBYztRQUNkLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSx3Q0FBd0MsRUFBRSxDQUFDLENBQUM7UUFDdEgsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUMvQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDcEIsQ0FBQyxDQUFDLENBQUM7UUFHSCxxQ0FBcUM7UUFDckMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxZQUFrQixFQUFFLEVBQUUsQ0FBQyxJQUFJLHFCQUFxQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFFbEgsQ0FBQztJQUVELGVBQWUsQ0FBQyxPQUFnQjtRQUMvQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFDN0UsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQTBCLEVBQUUsRUFBRTtZQUNqRCxRQUFRLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUM1QixDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFHRCxXQUFXO1FBQ1YsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUN2RSxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsWUFBeUIsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDN0UsQ0FBQztJQUVELCtFQUErRTtJQUMvRSwwQkFBMEI7UUFDekIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO1FBQ3JGLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUM3RSxJQUFJLGdCQUFnQixFQUFFO1lBQ3JCLElBQUksVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQzFCLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7YUFDMUM7aUJBQU07Z0JBQ04sZ0JBQWdCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQzthQUM3QztTQUNEO0lBQ0YsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSXRlbVZpZXcsIFdvcmtzcGFjZUxlYWYgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBOb3RpZmljYXRpb25Db21wb25lbnQgfSBmcm9tICcuL25vdGlmaWNhdGlvbic7XG5pbXBvcnQgeyBOb3RlIH0gZnJvbSAnY29udHJvbGxlcnMvbm90ZXMnO1xuXG5leHBvcnQgY29uc3QgVklFV19UWVBFX05PVElGSUNBVElPTl9EQVNIQk9BUkQgPSAnbm90aWZpY2F0aW9uLWRhc2hib2FyZC12aWV3JztcblxuZXhwb3J0IGNsYXNzIE5vdGlmaWNhdGlvbkRhc2hib2FyZFZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XG5cdHByaXZhdGUgbm90aWZpY2F0aW9uczogTm90ZVtdID0gW107XG5cblx0Y29uc3RydWN0b3IobGVhZjogV29ya3NwYWNlTGVhZiwgbm90aWZpY2F0aW9uczogTm90ZVtdKSB7XG5cdFx0c3VwZXIobGVhZik7XG5cdFx0dGhpcy5ub3RpZmljYXRpb25zID0gbm90aWZpY2F0aW9ucztcblx0fVxuXG5cdGdldFZpZXdUeXBlKCk6IHN0cmluZyB7XG5cdFx0cmV0dXJuIFZJRVdfVFlQRV9OT1RJRklDQVRJT05fREFTSEJPQVJEO1xuXHR9XG5cblx0Z2V0RGlzcGxheVRleHQoKTogc3RyaW5nIHtcblx0XHRyZXR1cm4gXCJOb3RpZmljYXRpb24gRGFzaGJvYXJkXCI7XG5cdH1cblxuXHRhc3luYyBvbk9wZW4oKSB7XG5cdFx0dGhpcy5pbml0VUkoKTtcblx0fVxuXG5cdGFzeW5jIG9uQ2xvc2UoKSB7XG5cdFx0Y29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG5cblx0XHRjb250ZW50RWwuZW1wdHkoKTtcblx0fVxuXG5cdGluaXRVSSgpIHtcblx0XHRjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcblxuXHRcdC8vIEFkZCBhIHN0eWxlIGJsb2NrIGZvciBjdXN0b20gc3R5bGVzXG5cdFx0Y29uc3Qgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuXHRcdHN0eWxlLnRleHRDb250ZW50ID0gYFxuXHRcdC5ub3RpZmljYXRpb24tZGFzaGJvYXJkIHtcblx0XHRcdHBhZGRpbmc6IDIwcHg7XG5cdFx0fVxuXHRcdC5ub3RpZmljYXRpb24taGVhZGVyIHtcblx0XHRcdGRpc3BsYXk6IGZsZXg7XG5cdFx0XHRqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XG4gICAgICAgIFx0YWxpZ24taXRlbXM6IGNlbnRlcjsgLyogQWxpZ24gaXRlbXMgdmVydGljYWxseSAqL1xuICAgICAgICBcdHBhZGRpbmc6IDEwcHg7XG4gICAgICAgIFx0Ym9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNlMWU0ZTg7XG4gICAgICAgIFx0Zm9udC13ZWlnaHQ6IGJvbGQ7XG4gICAgXHR9XG5cdFx0Lm5vdGlmaWNhdGlvbi1oZWFkZXIgLmRvbmUtaGVhZGVyLWJ1dHRvbiB7XG5cdFx0XHRkaXNwbGF5OiBub25lOyAvKiBJbml0aWFsbHkgaGlkZSB0aGUgZG9uZSBidXR0b24gKi9cblx0XHR9XG5cdFx0Lm5vdGlmaWNhdGlvbi1oZWFkZXIgLmRvbmUtaGVhZGVyLWJ1dHRvbi52aXNpYmxlIHtcblx0XHRcdGRpc3BsYXk6IGlubGluZS1ibG9jazsgLyogU2hvdyB3aGVuIHRoZSB2aXNpYmxlIGNsYXNzIGlzIGFkZGVkICovXG5cdFx0fVxuICAgIFx0Lm5vdGlmaWNhdGlvbiB7XG4gICAgXHQgICAgZGlzcGxheTogZmxleDtcbiAgICBcdCAgICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XG4gICAgXHQgICAgcGFkZGluZzogMTBweDtcbiAgICBcdCAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2UxZTRlODtcbiAgICBcdCAgICB0cmFuc2l0aW9uOiBiYWNrZ3JvdW5kLWNvbG9yIDAuMnMgZWFzZS1pbi1vdXQ7XG4gICAgXHQgICAgaGVpZ2h0OiA0MHB4OyAvKiBTZXQgYSBmaXhlZCBoZWlnaHQgKi9cbiAgICBcdCAgICBhbGlnbi1pdGVtczogY2VudGVyOyBcbiAgICBcdH1cbiAgICBcdC5ub3RpZmljYXRpb24tY2hlY2tib3gge1xuICAgIFx0ICAgIG1hcmdpbi1yaWdodDogMTBweDtcbiAgICBcdH1cbiAgICBcdC5ub3RpZmljYXRpb24tdGl0bGUge1xuICAgIFx0ICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xuICAgIFx0ICAgIG1hcmdpbi1yaWdodDogMTBweDtcbiAgICBcdCAgICBmbGV4OiAxO1xuICAgIFx0fVxuICAgIFx0Lm5vdGlmaWNhdGlvbi1idXR0b25zLWNvbnRhaW5lciB7XG4gICAgXHQgICAgZGlzcGxheTogbm9uZTtcbiAgICBcdCAgICBmbGV4LWRpcmVjdGlvbjogcm93O1xuICAgIFx0ICAgIGdhcDogNXB4O1xuICAgIFx0fVxuICAgIFx0LmhpZ2hsaWdodGVkIHtcbiAgICBcdCAgICBiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS1iYWNrZ3JvdW5kLW1vZGlmaWVyLWhvdmVyKTtcbiAgICBcdH1cdFxuXHRcdGA7XG5cdFx0ZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7XG5cblx0XHQvLyBNYWluIGNvbnRhaW5lclxuXHRcdGNvbnN0IGNvbnRhaW5lciA9IGNvbnRlbnRFbC5jcmVhdGVFbCgnZGl2JywgeyBjbHM6ICdub3RpZmljYXRpb24tZGFzaGJvYXJkJyB9KTtcblxuXHRcdC8vIEhlYWRlclxuXHRcdGNvbnN0IGhlYWRlckVsID0gY29udGFpbmVyLmNyZWF0ZUVsKCdkaXYnLCB7IGNsczogJ25vdGlmaWNhdGlvbi1oZWFkZXInIH0pO1xuXG5cdFx0Ly8gU2VsZWN0IEFsbCBDaGVja2JveFxuXHRcdGNvbnN0IHNlbGVjdEFsbENoZWNrYm94RWwgPSBoZWFkZXJFbC5jcmVhdGVFbCgnaW5wdXQnLCB7IHR5cGU6ICdjaGVja2JveCcsIGNsczogJ25vdGlmaWNhdGlvbi1jaGVja2JveCcgfSk7XG5cdFx0c2VsZWN0QWxsQ2hlY2tib3hFbC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoKSA9PiB0aGlzLnRvZ2dsZVNlbGVjdEFsbChzZWxlY3RBbGxDaGVja2JveEVsLmNoZWNrZWQpKTtcblxuXHRcdC8vIFRpdGxlIExhYmVsXG5cdFx0aGVhZGVyRWwuY3JlYXRlRWwoJ2RpdicsIHsgdGV4dDogJ1NlbGVjdCBhbGwnLCBjbHM6ICdub3RpZmljYXRpb24tdGl0bGUnIH0pO1xuXG5cdFx0Ly8gRG9uZSBCdXR0b25cblx0XHRjb25zdCBkb25lSGVhZGVyQnV0dG9uID0gaGVhZGVyRWwuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ0RvbmUnLCBjbHM6ICdub3RpZmljYXRpb24tYnV0dG9uIGRvbmUtaGVhZGVyLWJ1dHRvbicgfSk7XG5cdFx0ZG9uZUhlYWRlckJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdHRoaXMubWFya0FsbERvbmUoKTtcblx0XHR9KTtcblxuXG5cdFx0Ly8gQWRkIG5vdGlmaWNhdGlvbnMgdG8gdGhlIGNvbnRhaW5lclxuXHRcdHRoaXMubm90aWZpY2F0aW9ucy5mb3JFYWNoKChub3RpZmljYXRpb246IE5vdGUpID0+IG5ldyBOb3RpZmljYXRpb25Db21wb25lbnQodGhpcy5hcHAsIGNvbnRhaW5lciwgbm90aWZpY2F0aW9uKSk7XG5cblx0fVxuXG5cdHRvZ2dsZVNlbGVjdEFsbChjaGVja2VkOiBib29sZWFuKSB7XG5cdFx0Y29uc3QgY2hlY2tib3hlcyA9IHRoaXMuY29udGVudEVsLnF1ZXJ5U2VsZWN0b3JBbGwoJy5ub3RpZmljYXRpb24tY2hlY2tib3gnKTtcblx0XHRjaGVja2JveGVzLmZvckVhY2goKGNoZWNrYm94OiBIVE1MSW5wdXRFbGVtZW50KSA9PiB7XG5cdFx0XHRjaGVja2JveC5jaGVja2VkID0gY2hlY2tlZDtcblx0XHR9KTtcblx0XHR0aGlzLnVwZGF0ZURvbmVCdXR0b25WaXNpYmlsaXR5KCk7XG5cdH1cblxuXG5cdG1hcmtBbGxEb25lKCkge1xuXHRcdGNvbnN0IG5vdGlmaWNhdGlvbnMgPSB0aGlzLmNvbnRlbnRFbC5xdWVyeVNlbGVjdG9yQWxsKCcubm90aWZpY2F0aW9uJyk7XG5cdFx0bm90aWZpY2F0aW9ucy5mb3JFYWNoKChub3RpZmljYXRpb246IEhUTUxFbGVtZW50KSA9PiBub3RpZmljYXRpb24ucmVtb3ZlKCkpO1xuXHR9XG5cblx0Ly8gQWRkIHRoZSB1cGRhdGVEb25lQnV0dG9uVmlzaWJpbGl0eSBtZXRob2QgdG8gTm90aWZpY2F0aW9uRGFzaGJvYXJkVmlldyBjbGFzc1xuXHR1cGRhdGVEb25lQnV0dG9uVmlzaWJpbGl0eSgpIHtcblx0XHRjb25zdCBjaGVja2JveGVzID0gdGhpcy5jb250ZW50RWwucXVlcnlTZWxlY3RvckFsbCgnLm5vdGlmaWNhdGlvbi1jaGVja2JveDpjaGVja2VkJyk7XG5cdFx0Y29uc3QgZG9uZUhlYWRlckJ1dHRvbiA9IHRoaXMuY29udGVudEVsLnF1ZXJ5U2VsZWN0b3IoJy5kb25lLWhlYWRlci1idXR0b24nKTtcblx0XHRpZiAoZG9uZUhlYWRlckJ1dHRvbikge1xuXHRcdFx0aWYgKGNoZWNrYm94ZXMubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRkb25lSGVhZGVyQnV0dG9uLmNsYXNzTGlzdC5hZGQoJ3Zpc2libGUnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGRvbmVIZWFkZXJCdXR0b24uY2xhc3NMaXN0LnJlbW92ZSgndmlzaWJsZScpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuXG4iXX0=