import { Component } from '@angular/core';
import { SharedComponent } from '../../../shared/shared';
import { RouterOutlet } from '@angular/router';


@Component({
  selector: 'responses-layout-component',
  standalone: true,
  imports: [SharedComponent, RouterOutlet],
  templateUrl: './responses-layout-component.html',
  styleUrl: './responses-layout-component.css',
})
export class ResponsesLayoutComponent {

}
